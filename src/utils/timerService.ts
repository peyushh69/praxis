import { TimerMode } from '../types';

export interface ActiveTimerData {
  mode: TimerMode;
  targetEndTime: number | null; // epoch ms when timer will complete
  timeLeft: number; // remaining seconds (exact when paused, or calculated)
  totalTime: number; // total duration in seconds
  isRunning: boolean;
  startedAt: number; // epoch ms
  completedCycles: number;
  activeTaskId: string | null;
  lastUpdated: number;
}

const ACTIVE_TIMER_KEY = 'praxis_active_timer_v1';

/**
 * Save current active timer session to localStorage
 */
export function saveActiveTimer(data: ActiveTimerData): void {
  try {
    localStorage.setItem(ACTIVE_TIMER_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save active timer to localStorage', e);
  }
}

/**
 * Load active timer session from localStorage and compute exact remaining time
 */
export function loadActiveTimer(): ActiveTimerData | null {
  try {
    const raw = localStorage.getItem(ACTIVE_TIMER_KEY);
    if (!raw) return null;
    const data: ActiveTimerData = JSON.parse(raw);

    if (data.isRunning && data.targetEndTime) {
      const now = Date.now();
      const remainingMs = data.targetEndTime - now;
      const remainingSecs = Math.round(remainingMs / 1000);
      data.timeLeft = remainingSecs;
    }

    return data;
  } catch (e) {
    console.error('Failed to load active timer from localStorage', e);
    return null;
  }
}

/**
 * Clear active timer from localStorage
 */
export function clearActiveTimer(): void {
  try {
    localStorage.removeItem(ACTIVE_TIMER_KEY);
  } catch (e) {
    console.error('Failed to clear active timer from localStorage', e);
  }
}

/**
 * Web Worker for accurate background interval ticking.
 * Chrome throttles window setInterval to 1 execution per minute in background tabs,
 * but Web Workers run continuously in a separate thread.
 */
class BackgroundWorkerTicker {
  private worker: Worker | null = null;
  private onTickCallback: (() => void) | null = null;

  start(onTick: () => void) {
    this.stop();
    this.onTickCallback = onTick;

    try {
      const workerScript = `
        var intervalId = null;
        self.onmessage = function(e) {
          if (e.data === 'start') {
            if (intervalId) clearInterval(intervalId);
            intervalId = setInterval(function() {
              self.postMessage('tick');
            }, 500);
          } else if (e.data === 'stop') {
            if (intervalId) {
              clearInterval(intervalId);
              intervalId = null;
            }
          }
        };
      `;
      const blob = new Blob([workerScript], { type: 'application/javascript' });
      const workerUrl = URL.createObjectURL(blob);
      this.worker = new Worker(workerUrl);

      this.worker.onmessage = (e) => {
        if (e.data === 'tick' && this.onTickCallback) {
          this.onTickCallback();
        }
      };

      this.worker.postMessage('start');
    } catch (e) {
      console.warn('Web Worker not supported or blocked, falling back to window interval', e);
    }
  }

  stop() {
    if (this.worker) {
      try {
        this.worker.postMessage('stop');
        this.worker.terminate();
      } catch {
        // Ignore
      }
      this.worker = null;
    }
    this.onTickCallback = null;
  }
}

export const backgroundTicker = new BackgroundWorkerTicker();

/**
 * Silent Audio Keep-Alive to prevent Chrome Memory Saver tab discarding.
 * Chrome tab discarder explicitly exempts tabs with an active audio stream from automatic discard.
 */
class AudioKeepAlive {
  private ctx: AudioContext | null = null;
  private oscillator: OscillatorNode | null = null;
  private gainNode: GainNode | null = null;

  start() {
    try {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
        }
      }

      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }

      if (this.ctx && !this.oscillator) {
        this.oscillator = this.ctx.createOscillator();
        this.gainNode = this.ctx.createGain();

        // Inaudible frequency and virtually zero gain - keeps the audio processing pipeline alive in the browser & OS
        this.oscillator.type = 'sine';
        this.oscillator.frequency.setValueAtTime(30, this.ctx.currentTime);
        this.gainNode.gain.setValueAtTime(0.000001, this.ctx.currentTime);

        this.oscillator.connect(this.gainNode);
        this.gainNode.connect(this.ctx.destination);
        this.oscillator.start();
      }
    } catch {
      // Audio autoplay policy might require user gesture (e.g. Start button click)
    }
  }

  stop() {
    try {
      if (this.oscillator) {
        this.oscillator.stop();
        this.oscillator.disconnect();
        this.oscillator = null;
      }
      if (this.gainNode) {
        this.gainNode.disconnect();
        this.gainNode = null;
      }
    } catch {
      // Ignore
    }
  }
}

export const audioKeepAlive = new AudioKeepAlive();

/**
 * Robust Screen WakeLock & Always On Display Manager
 * Prevents mobile phones (Android Chrome, iOS Safari, Samsung Internet, WebViews)
 * from dimming, sleeping, or turning black during Pomodoro sessions and fullscreen mode.
 *
 * Uses a 3-layer keep-awake architecture:
 * 1. Native Screen Wake Lock API (navigator.wakeLock.request('screen'))
 * 2. Foreground 2px Live-Canvas Video Stream (<video> at z-index 2147483647 decoding 2fps frames)
 *    which triggers OS-level VideoWakeLock on Android & iOS even inside iframes where
 *    Permissions-Policy blocks navigator.wakeLock.
 * 3. Direct User-Gesture unlocking + 4-second heartbeat verification.
 */
class WakeLockManager {
  private sentinel: any = null;
  private timerActive = false;
  private fullscreenActive = false;
  private keepAwakeVideo: HTMLVideoElement | null = null;
  private keepAwakeCanvas: HTMLCanvasElement | null = null;
  private audioCtx: AudioContext | null = null;
  private canvasTimer: number | null = null;
  private heartbeatTimer: number | null = null;
  private frameToggle = false;
  private listenersAttached = false;

  constructor() {
    this.attachAutoReacquireListeners();
  }

  private get shouldStayAwake(): boolean {
    return this.timerActive || this.fullscreenActive;
  }

  private attachAutoReacquireListeners() {
    if (typeof window === 'undefined' || this.listenersAttached) return;
    this.listenersAttached = true;

    const reassertIfNeeded = () => {
      if (this.shouldStayAwake && document.visibilityState === 'visible') {
        this.acquireNow();
      }
    };

    document.addEventListener('visibilitychange', reassertIfNeeded);
    window.addEventListener('focus', reassertIfNeeded);
    window.addEventListener('touchstart', reassertIfNeeded, { passive: true });
    window.addEventListener('touchend', reassertIfNeeded, { passive: true });
    window.addEventListener('pointerdown', reassertIfNeeded, { passive: true });
    window.addEventListener('click', reassertIfNeeded, { passive: true });
  }

  isSupported(): boolean {
    return true;
  }

  isActive(): boolean {
    return (
      Boolean(this.sentinel && !this.sentinel.released) ||
      Boolean(this.keepAwakeVideo && !this.keepAwakeVideo.paused)
    );
  }

  /**
   * Explicitly mark whether the countdown timer is running
   */
  setTimerActive(active: boolean) {
    this.timerActive = active;
    if (this.shouldStayAwake) {
      this.acquireNow();
    } else {
      this.forceReleaseAll();
    }
  }

  /**
   * Explicitly mark whether fullscreen mode is open
   */
  setFullscreenActive(active: boolean) {
    this.fullscreenActive = active;
    if (this.shouldStayAwake) {
      this.acquireNow();
    } else {
      this.forceReleaseAll();
    }
  }

  /**
   * Call synchronously inside onClick / onPointerDown handlers to unlock
   * mobile browser media & wakeLock policies immediately within user gesture.
   */
  acquireFromUserGesture() {
    this.acquireNow();
  }

  async request(): Promise<boolean> {
    this.timerActive = true;
    return this.acquireNow();
  }

  release() {
    this.timerActive = false;
    // Only release if neither timer nor fullscreen is active
    if (!this.shouldStayAwake) {
      this.forceReleaseAll();
    }
  }

  private async acquireNow(): Promise<boolean> {
    this.startHeartbeat();

    // Always run the foreground video+audio keep-awake stream in parallel with native wakeLock
    // because mobile iframes/WebViews can block or drop navigator.wakeLock.
    this.startKeepAwakeVideo();

    if (typeof navigator !== 'undefined' && 'wakeLock' in navigator) {
      try {
        if (!this.sentinel || this.sentinel.released) {
          this.sentinel = await (navigator as any).wakeLock.request('screen');
          this.sentinel.addEventListener('release', () => {
            this.sentinel = null;
            if (this.shouldStayAwake && document.visibilityState === 'visible') {
              setTimeout(() => {
                if (this.shouldStayAwake) {
                  this.acquireNow().catch(() => {});
                }
              }, 250);
            }
          });
        }
      } catch {
        // VideoWakeLock stream is already active and keeping display awake
      }
    }

    return true;
  }

  private startHeartbeat() {
    if (this.heartbeatTimer !== null || typeof window === 'undefined') return;
    this.heartbeatTimer = window.setInterval(() => {
      if (!this.shouldStayAwake) {
        this.stopHeartbeat();
        return;
      }
      if (document.visibilityState === 'visible') {
        if (typeof navigator !== 'undefined' && 'wakeLock' in navigator && (!this.sentinel || this.sentinel.released)) {
          (navigator as any).wakeLock
            .request('screen')
            .then((s: any) => {
              this.sentinel = s;
            })
            .catch(() => {});
        }
        if (this.keepAwakeVideo && this.keepAwakeVideo.paused) {
          this.keepAwakeVideo.play().catch(() => {});
        }
      }
    }, 3000);
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer !== null) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private startKeepAwakeVideo() {
    try {
      if (typeof document === 'undefined') return;

      // 1. Create a 64x64 canvas that repaints 4 times per second so the video stream
      // has continuous frame updates (required by Chromium VideoWakeLock)
      if (!this.keepAwakeCanvas) {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        this.keepAwakeCanvas = canvas;
      }

      const drawFrame = () => {
        if (!this.keepAwakeCanvas) return;
        const ctx = this.keepAwakeCanvas.getContext('2d');
        if (ctx) {
          this.frameToggle = !this.frameToggle;
          ctx.fillStyle = this.frameToggle ? '#010101' : '#020202';
          ctx.fillRect(0, 0, 64, 64);
          ctx.fillStyle = this.frameToggle ? '#030303' : '#010101';
          ctx.fillRect(16, 16, 32, 32);
        }
      };

      drawFrame();
      if (this.canvasTimer === null) {
        this.canvasTimer = window.setInterval(drawFrame, 250);
      }

      // 2. Create foreground video element covering >25% of viewport (60vw x 60vh) at opacity 0.004
      // CRITICAL: Chromium's VideoWakeLock (video_wake_lock.cc) enforces kSizeThreshold = 0.2 (20% of viewport).
      // Any muted video smaller than 20% of the viewport is ignored by Android Chrome as a decorative icon!
      if (!this.keepAwakeVideo) {
        const video = document.createElement('video');
        video.setAttribute('playsinline', 'true');
        video.setAttribute('webkit-playsinline', 'true');
        video.muted = true;
        video.loop = true;
        video.autoplay = true;
        video.style.position = 'fixed';
        video.style.top = '20vh';
        video.style.left = '20vw';
        video.style.width = '60vw';
        video.style.height = '60vh';
        video.style.opacity = '0.004';
        video.style.pointerEvents = 'none';
        video.style.zIndex = '2147483647';

        const anyCanvas = this.keepAwakeCanvas as any;
        let stream: MediaStream | null = null;
        if (typeof anyCanvas.captureStream === 'function') {
          stream = anyCanvas.captureStream(4);
        } else if (typeof anyCanvas.mozCaptureStream === 'function') {
          stream = anyCanvas.mozCaptureStream(4);
        }

        // Attach a silent audio track to the MediaStream so Android/iOS media power manager
        // treats the stream as an active audiovisual playback session
        try {
          const AudioCtx =
            window.AudioContext ||
            (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
          if (AudioCtx && stream) {
            if (!this.audioCtx) {
              this.audioCtx = new AudioCtx();
            }
            if (this.audioCtx.state === 'suspended') {
              this.audioCtx.resume().catch(() => {});
            }
            const dst = this.audioCtx.createMediaStreamDestination();
            const osc = this.audioCtx.createOscillator();
            const gain = this.audioCtx.createGain();
            osc.frequency.value = 20;
            gain.gain.value = 0.00001;
            osc.connect(gain);
            gain.connect(dst);
            osc.start();
            const audioTrack = dst.stream.getAudioTracks()[0];
            if (audioTrack) {
              stream.addTrack(audioTrack);
            }
          }
        } catch {
          // Ignore audio track attachment errors
        }

        if (stream) {
          video.srcObject = stream;
        }

        document.body.appendChild(video);
        this.keepAwakeVideo = video;
      }

      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().catch(() => {});
      }

      if (this.keepAwakeVideo && this.keepAwakeVideo.paused) {
        this.keepAwakeVideo.play().catch(() => {});
      }
    } catch {
      // Ignore errors
    }
  }

  private forceReleaseAll() {
    this.stopHeartbeat();
    if (this.canvasTimer !== null) {
      clearInterval(this.canvasTimer);
      this.canvasTimer = null;
    }
    try {
      if (this.sentinel) {
        this.sentinel.release();
        this.sentinel = null;
      }
    } catch {
      this.sentinel = null;
    }
    try {
      if (this.keepAwakeVideo) {
        this.keepAwakeVideo.pause();
        this.keepAwakeVideo.srcObject = null;
        if (this.keepAwakeVideo.parentNode) {
          this.keepAwakeVideo.parentNode.removeChild(this.keepAwakeVideo);
        }
        this.keepAwakeVideo = null;
      }
    } catch {
      this.keepAwakeVideo = null;
    }
  }
}

export const wakeLockManager = new WakeLockManager();

/**
 * Web Notifications helper
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }
  try {
    if (Notification.permission === 'granted') {
      return true;
    }
    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
  } catch {
    return false;
  }
  return false;
}

export function showDesktopNotification(title: string, options?: NotificationOptions): void {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return;
  }
  try {
    if (Notification.permission === 'granted') {
      new Notification(title, {
        badge: '/favicon.ico',
        icon: '/favicon.ico',
        ...options,
      });
    }
  } catch (e) {
    console.warn('Could not show desktop notification', e);
  }
}

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
 * Screen WakeLock to prevent PC from sleeping during focus sessions if supported
 */
class WakeLockManager {
  private sentinel: any = null;

  async request() {
    try {
      if ('wakeLock' in navigator && !this.sentinel) {
        this.sentinel = await (navigator as any).wakeLock.request('screen');
        this.sentinel.addEventListener('release', () => {
          this.sentinel = null;
        });
      }
    } catch {
      // Wake Lock could not be acquired (e.g. low battery or unsupported)
    }
  }

  release() {
    try {
      if (this.sentinel) {
        this.sentinel.release();
        this.sentinel = null;
      }
    } catch {
      // Ignore
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

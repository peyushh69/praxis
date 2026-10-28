/**
 * Authentic 8-Bit Pixel Retro Audio Synthesizer (Web Audio API)
 */

class PixelAudioSynthesizer {
  private ctx: AudioContext | null = null;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  // 8-bit Button Click / Blip
  playClick(volume = 0.5) {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.setValueAtTime(880, now + 0.03);

      gain.gain.setValueAtTime(volume * 0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.08);
    } catch {
      // Audio context restricted
    }
  }

  // 8-bit Start / Power-up Arpeggio
  playStart(volume = 0.5) {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const notes = [261.63, 329.63, 392.0, 523.25]; // C4, E4, G4, C5 8-bit arpeggio
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, now + idx * 0.04);

        gain.gain.setValueAtTime(volume * 0.2, now + idx * 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.04 + 0.09);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.04);
        osc.stop(now + idx * 0.04 + 0.1);
      });
    } catch {
      // Ignore
    }
  }

  // 8-bit Pause Sound
  playPause(volume = 0.5) {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.setValueAtTime(392.0, now + 0.06); // G4

      gain.gain.setValueAtTime(volume * 0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.15);
    } catch {
      // Ignore
    }
  }

  // 8-bit Victory / Level Clear Fanfare
  playComplete(volume = 0.6) {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      // Classic 8-bit retro fanfare sequence
      const melody = [
        { freq: 440, time: 0.0, dur: 0.09 },    // A4
        { freq: 554.37, time: 0.09, dur: 0.09 }, // C#5
        { freq: 659.25, time: 0.18, dur: 0.09 }, // E5
        { freq: 880, time: 0.27, dur: 0.24 },    // A5
        { freq: 783.99, time: 0.52, dur: 0.09 }, // G5
        { freq: 880, time: 0.62, dur: 0.35 },    // A5 (long)
      ];

      melody.forEach((note) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(note.freq, now + note.time);

        gain.gain.setValueAtTime(volume * 0.25, now + note.time);
        gain.gain.exponentialRampToValueAtTime(0.001, now + note.time + note.dur);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + note.time);
        osc.stop(now + note.time + note.dur + 0.02);
      });
    } catch {
      // Ignore
    }
  }

  // 8-bit Tick
  playTick(volume = 0.3) {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(900, now);

      gain.gain.setValueAtTime(volume * 0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.015);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.02);
    } catch {
      // Ignore
    }
  }

  private alarmAudio: HTMLAudioElement | null = null;
  private alarmCycleTimer: number | null = null;
  private alarmLoopStartTime: number | null = null;
  private lastSynthFallbackMs = 0;
  private lastVibrateMs = 0;

  private getAlarmAudio(): HTMLAudioElement | null {
    if (typeof window === 'undefined' || typeof Audio === 'undefined') return null;
    if (!this.alarmAudio) {
      this.alarmAudio = new Audio('/assets/aistudio/flutie8211-triple-high-pitch-electronic-beeps-486292_16b417e8.mp3');
      this.alarmAudio.preload = 'auto';
    }
    return this.alarmAudio;
  }

  // Synthesized fallback only if HTMLAudioElement playback is blocked
  private playSynthBeepFallback(volume = 0.7) {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const beeps = [
        { freq: 2800, start: 0.0, dur: 0.075 },
        { freq: 2800, start: 0.11, dur: 0.075 },
        { freq: 2800, start: 0.38, dur: 0.075 },
        { freq: 2800, start: 0.49, dur: 0.075 },
      ];
      beeps.forEach((b) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(b.freq, now + b.start);
        const peak = Math.max(0.08, Math.min(1, volume)) * 0.28;
        gain.gain.setValueAtTime(peak, now + b.start);
        gain.gain.exponentialRampToValueAtTime(0.001, now + b.start + b.dur);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + b.start);
        osc.stop(now + b.start + b.dur + 0.01);
      });
    } catch {
      // Ignore
    }
  }

  // Play the uploaded Beep-Beep alarm tone once (e.g., for testing)
  playBeepAlarm(volume = 0.8) {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate([160, 80, 160, 320, 160, 80, 160]);
      } catch {
        // Ignore vibration errors
      }
    }

    const audio = this.getAlarmAudio();
    if (audio) {
      try {
        audio.loop = false;
        audio.currentTime = 0;
        audio.volume = Math.max(0.1, Math.min(1, volume));
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.catch(() => {
            this.playSynthBeepFallback(volume);
          });
        }
        return;
      } catch {
        // Fallback to Web Audio synth
      }
    }
    this.playSynthBeepFallback(volume);
  }

  /**
   * Starts the alarm with a strict 1-minute RINGING / 1-minute SILENT GAP cycle
   * that repeats indefinitely until stopAlarmLoop() is called when user clicks "Stop".
   */
  startAlarmLoop(volume = 0.85) {
    this.stopAlarmLoop();
    this.alarmLoopStartTime = Date.now();
    this.lastSynthFallbackMs = 0;
    this.lastVibrateMs = 0;

    const safeVolume = Math.max(0.15, Math.min(1, volume));

    const tickCycle = () => {
      if (this.alarmLoopStartTime === null) return;
      const now = Date.now();
      const elapsedMs = now - this.alarmLoopStartTime;
      // Even minutes (0..1m, 2..3m, 4..5m) = RINGING (60s)
      // Odd minutes (1..2m, 3..4m, 5..6m) = SILENT GAP (60s)
      const minuteBlock = Math.floor(elapsedMs / 60000);
      const isRingingMinute = minuteBlock % 2 === 0;

      const audio = this.getAlarmAudio();

      if (isRingingMinute) {
        if (typeof navigator !== 'undefined' && navigator.vibrate && now - this.lastVibrateMs >= 2000) {
          this.lastVibrateMs = now;
          try {
            navigator.vibrate([200, 100, 200, 300, 200, 100, 200]);
          } catch {
            // Ignore
          }
        }

        if (audio) {
          audio.loop = true;
          audio.volume = safeVolume;
          if (audio.paused) {
            const p = audio.play();
            if (p !== undefined) {
              p.catch(() => {
                if (now - this.lastSynthFallbackMs >= 1400) {
                  this.lastSynthFallbackMs = now;
                  this.playSynthBeepFallback(safeVolume);
                }
              });
            }
          }
        } else if (now - this.lastSynthFallbackMs >= 1400) {
          this.lastSynthFallbackMs = now;
          this.playSynthBeepFallback(safeVolume);
        }
      } else {
        // 1-Minute Silent Gap
        if (audio && !audio.paused) {
          try {
            audio.pause();
            audio.currentTime = 0;
          } catch {
            // Ignore
          }
        }
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          try {
            navigator.vibrate(0);
          } catch {
            // Ignore
          }
        }
      }
    };

    tickCycle();
    if (typeof window !== 'undefined') {
      this.alarmCycleTimer = window.setInterval(tickCycle, 500);
    }
  }

  getAlarmCycleState(): { isRingingMinute: boolean; secondsRemainingInPhase: number } {
    if (this.alarmLoopStartTime === null) {
      return { isRingingMinute: true, secondsRemainingInPhase: 60 };
    }
    const elapsedMs = Math.max(0, Date.now() - this.alarmLoopStartTime);
    const minuteBlock = Math.floor(elapsedMs / 60000);
    const isRingingMinute = minuteBlock % 2 === 0;
    const msIntoCurrentMinute = elapsedMs % 60000;
    const secondsRemainingInPhase = Math.max(1, Math.ceil((60000 - msIntoCurrentMinute) / 1000));
    return { isRingingMinute, secondsRemainingInPhase };
  }

  stopAlarmLoop() {
    this.alarmLoopStartTime = null;
    if (this.alarmCycleTimer !== null && typeof window !== 'undefined') {
      clearInterval(this.alarmCycleTimer);
      this.alarmCycleTimer = null;
    }
    if (this.alarmAudio) {
      try {
        this.alarmAudio.pause();
        this.alarmAudio.currentTime = 0;
        this.alarmAudio.loop = false;
      } catch {
        // Ignore
      }
    }
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(0);
      } catch {
        // Ignore
      }
    }
  }
}

export const pixelAudio = new PixelAudioSynthesizer();
export const cleanAudio = pixelAudio;



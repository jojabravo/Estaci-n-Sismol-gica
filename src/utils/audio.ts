// Web Audio API Synthesizer specialized for Seismic P and S waves
class SeismicAudioEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false; // Unmuted by default on user interaction

  public initCtx() {
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (!this.isMuted) {
      this.initCtx();
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (!this.isMuted) {
      this.initCtx();
    }
    return this.isMuted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  /**
   * Onda P (Longitudinal / Compresional / Resorte):
   * Acoustic character: Sharp, fast pressure shock, high velocity, metallic compression snap.
   * High-mid frequency pitch drop (280 Hz -> 80 Hz) combined with a high-pass noise click.
   */
  public playWaveP(volume: number = 0.6) {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;

      // 1. Primary Compression Pitch Drop (Spring / Pressure Impulse)
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(280, now);
      osc.frequency.exponentialRampToValueAtTime(70, now + 0.18);

      oscGain.gain.setValueAtTime(0.45 * volume, now);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      osc.connect(oscGain);
      oscGain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.25);

      // 2. High Pressure Snap Click (Compression burst)
      const bufferSize = Math.floor(this.ctx.sampleRate * 0.05); // 50ms noise
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1200, now);
      filter.Q.setValueAtTime(3, now);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.35 * volume, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.ctx.destination);

      noise.start(now);
      noise.stop(now + 0.09);
    } catch {
      // Audio autoplay policy fallback
    }
  }

  /**
   * Onda S (Transversal / Cizalla / Cuerda):
   * Acoustic character: Deep, heavy ground vibration, undulating shear motion, low frequency rumble with pitch fluctuation (LFO vibrato).
   */
  public playWaveS(volume: number = 0.7) {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const duration = 0.85;

      // 1. Heavy Sub-Bass Sawtooth / Sine Shear Oscillators
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const lfo = this.ctx.createOscillator();
      const lfoGain = this.ctx.createGain();
      const mainGain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      // LFO for wave pitch modulation (simulating string / shear vibration)
      lfo.type = 'sine';
      lfo.frequency.setValueAtTime(8, now); // 8 Hz shear shake
      lfoGain.gain.setValueAtTime(18, now); // pitch depth

      lfo.connect(osc1.frequency);
      lfo.connect(osc2.frequency);

      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(65, now);
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(40, now); // deep sub

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(240, now);
      filter.frequency.exponentialRampToValueAtTime(80, now + duration);

      mainGain.gain.setValueAtTime(0.01, now);
      mainGain.gain.linearRampToValueAtTime(0.55 * volume, now + 0.06);
      mainGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(mainGain);
      mainGain.connect(this.ctx.destination);

      lfo.start(now);
      osc1.start(now);
      osc2.start(now);

      lfo.stop(now + duration);
      osc1.stop(now + duration);
      osc2.stop(now + duration);
    } catch {
      // Ignore
    }
  }

  /**
   * Station Seismometer Arrival Pulses
   */
  public playArrivalPulse(type: 'P' | 'S') {
    if (type === 'P') {
      // Double sharp compression strike for P-wave arrival
      this.playWaveP(0.9);
      setTimeout(() => this.playWaveP(0.5), 110);
    } else {
      // Heavy deep rumble burst for S-wave arrival
      this.playWaveS(1.0);
    }
  }

  public playClick() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(520, now);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.06);
    } catch {
      // Ignore
    }
  }
}

export const audioEngine = new SeismicAudioEngine();


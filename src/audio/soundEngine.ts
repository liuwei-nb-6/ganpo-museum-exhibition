// Procedural Web Audio API synthesizer for:
// 1. Subtle dark-museum twilight ambient soundscape
// 2. Authentic ancient Chinese instruments: 鎏金青铜编钟 (一钟双音), 青铜笙 (簧管和声), 竹排箫 (气鸣竹韵)
// 3. Tactile seal stamp thud for the Museum Passport

class MuseumSoundEngine {
  private ctx: AudioContext | null = null;
  private ambientActive = false;
  private ambientGain: GainNode | null = null;
  private ambientOscs: OscillatorNode[] = [];
  private ambientTimer: number | null = null;
  private melodyTimeouts: number[] = [];

  private ensureContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  public isAmbientPlaying(): boolean {
    return this.ambientActive;
  }

  public toggleAmbient(): boolean {
    if (this.ambientActive) {
      this.stopAmbient();
      return false;
    } else {
      this.startAmbient();
      return true;
    }
  }

  public startAmbient(): void {
    if (this.ambientActive) return;
    const ctx = this.ensureContext();
    const now = ctx.currentTime;

    const master = ctx.createGain();
    master.gain.setValueAtTime(0.0001, now);
    master.gain.exponentialRampToValueAtTime(0.08, now + 2.2);

    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.setValueAtTime(420, now);
    lowpass.connect(master);
    master.connect(ctx.destination);

    // Warm deep museum hall drone (D2 + A2 + F#3 soft fifth)
    const freqs = [73.42, 110.0, 146.83];
    const oscs: OscillatorNode[] = [];
    freqs.forEach((f, idx) => {
      const osc = ctx.createOscillator();
      osc.type = idx === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(f, now);

      const g = ctx.createGain();
      g.gain.setValueAtTime(idx === 0 ? 0.45 : idx === 1 ? 0.28 : 0.14, now);
      osc.connect(g);
      g.connect(lowpass);
      osc.start(now);
      oscs.push(osc);
    });

    this.ambientGain = master;
    this.ambientOscs = oscs;
    this.ambientActive = true;

    // Occasional distant delicate bronze chime overtone every 6-10s
    const pentatonic = [293.66, 329.63, 392.0, 440.0, 523.25, 587.33];
    const schedulePing = () => {
      if (!this.ambientActive) return;
      const delay = 5500 + Math.random() * 5000;
      this.ambientTimer = window.setTimeout(() => {
        if (!this.ambientActive) return;
        const f = pentatonic[Math.floor(Math.random() * pentatonic.length)];
        this.playSoftHallPing(f);
        schedulePing();
      }, delay);
    };
    schedulePing();
  }

  public stopAmbient(): void {
    this.ambientActive = false;
    if (this.ambientTimer !== null) {
      clearTimeout(this.ambientTimer);
      this.ambientTimer = null;
    }
    if (this.ctx && this.ambientGain) {
      const now = this.ctx.currentTime;
      this.ambientGain.gain.cancelScheduledValues(now);
      this.ambientGain.gain.setValueAtTime(Math.max(this.ambientGain.gain.value, 0.0001), now);
      this.ambientGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.8);
      const oscs = this.ambientOscs;
      setTimeout(() => {
        oscs.forEach((o) => {
          try {
            o.stop();
          } catch {
            // ignore
          }
        });
      }, 900);
    }
    this.ambientOscs = [];
    this.ambientGain = null;
  }

  private playSoftHallPing(freq: number): void {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(0.022, now + 0.08);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 3.4);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 3.5);
  }

  /** Play 鎏金青铜编钟: rich metallic bronze bell with authentic inharmonic partials & wooden mallet strike */
  public playBianzhong(freq: number, isSideStrike = false): void {
    const ctx = this.ensureContext();
    const now = ctx.currentTime;

    const master = ctx.createGain();
    master.gain.setValueAtTime(0.42, now);
    master.connect(ctx.destination);

    // Bronze chime partial ratios (slightly brighter for 侧鼓音)
    const partials = isSideStrike
      ? [
          { ratio: 1.0, amp: 0.85, decay: 2.1 },
          { ratio: 1.003, amp: 0.35, decay: 1.9 },
          { ratio: 2.04, amp: 0.42, decay: 1.2 },
          { ratio: 2.76, amp: 0.24, decay: 0.85 },
          { ratio: 3.92, amp: 0.14, decay: 0.55 },
        ]
      : [
          { ratio: 1.0, amp: 1.0, decay: 2.7 },
          { ratio: 1.0025, amp: 0.4, decay: 2.4 },
          { ratio: 2.0, amp: 0.38, decay: 1.45 },
          { ratio: 2.44, amp: 0.22, decay: 1.0 },
          { ratio: 3.02, amp: 0.14, decay: 0.75 },
          { ratio: 4.18, amp: 0.08, decay: 0.45 },
        ];

    partials.forEach((p) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq * p.ratio, now);

      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, now);
      g.gain.linearRampToValueAtTime(p.amp * 0.45, now + 0.006);
      g.gain.exponentialRampToValueAtTime(0.0001, now + p.decay);

      osc.connect(g);
      g.connect(master);
      osc.start(now);
      osc.stop(now + p.decay + 0.05);
    });

    // Mallet impact transient
    const bufLen = Math.floor(ctx.sampleRate * 0.045);
    const noiseBuf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const data = noiseBuf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.007));
    }
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuf;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(freq * 3.2, now);
    bp.Q.setValueAtTime(2.5, now);
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0.28, now);
    noise.connect(bp);
    bp.connect(ng);
    ng.connect(master);
    noise.start(now);
  }

  /** Play 青铜笙: ancient free-reed mouth organ with traditional harmonic fifth chord */
  public playSheng(freqs: number[], duration = 1.25): void {
    const ctx = this.ensureContext();
    const now = ctx.currentTime;

    const master = ctx.createGain();
    master.gain.setValueAtTime(0.0001, now);
    master.gain.linearRampToValueAtTime(0.24, now + 0.09);
    master.gain.setValueAtTime(0.22, now + duration * 0.72);
    master.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    const formant = ctx.createBiquadFilter();
    formant.type = 'bandpass';
    formant.frequency.setValueAtTime(1150, now);
    formant.Q.setValueAtTime(1.4, now);

    const warmLow = ctx.createBiquadFilter();
    warmLow.type = 'lowpass';
    warmLow.frequency.setValueAtTime(2800, now);

    formant.connect(warmLow);
    warmLow.connect(master);
    master.connect(ctx.destination);

    // Subtle vibrato LFO
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.setValueAtTime(5.2, now);
    lfoGain.gain.setValueAtTime(2.5, now);
    lfo.connect(lfoGain);
    lfo.start(now);
    lfo.stop(now + duration + 0.05);

    freqs.forEach((f, i) => {
      const osc1 = ctx.createOscillator();
      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(f, now);
      lfoGain.connect(osc1.frequency);

      const osc2 = ctx.createOscillator();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(f * 2, now);

      const g1 = ctx.createGain();
      g1.gain.setValueAtTime(i === 0 ? 0.55 : 0.35, now);
      const g2 = ctx.createGain();
      g2.gain.setValueAtTime(0.18, now);

      osc1.connect(g1);
      g1.connect(formant);
      osc2.connect(g2);
      g2.connect(warmLow);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + duration + 0.05);
      osc2.stop(now + duration + 0.05);
    });
  }

  /** Play 竹排箫: airy bamboo panpipe with delicate breath chiff & warm woody tone */
  public playPaixiao(freq: number, duration = 1.15): void {
    const ctx = this.ensureContext();
    const now = ctx.currentTime;

    const master = ctx.createGain();
    master.gain.setValueAtTime(0.0001, now);
    master.gain.linearRampToValueAtTime(0.28, now + 0.08);
    master.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    master.connect(ctx.destination);

    // Pure hollow bamboo fundamental + soft 3rd harmonic
    const osc1 = ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(freq, now);

    const osc3 = ctx.createOscillator();
    osc3.type = 'sine';
    osc3.frequency.setValueAtTime(freq * 3, now);
    const g3 = ctx.createGain();
    g3.gain.setValueAtTime(0.09, now);

    // Gentle breath vibrato
    const lfo = ctx.createOscillator();
    const lg = ctx.createGain();
    lfo.frequency.setValueAtTime(4.8, now);
    lg.gain.setValueAtTime(freq * 0.006, now);
    lfo.connect(lg);
    lg.connect(osc1.frequency);

    osc1.connect(master);
    osc3.connect(g3);
    g3.connect(master);

    osc1.start(now);
    osc3.start(now);
    lfo.start(now);
    osc1.stop(now + duration + 0.05);
    osc3.stop(now + duration + 0.05);
    lfo.stop(now + duration + 0.05);

    // Airy bamboo breath noise
    const bufLen = Math.floor(ctx.sampleRate * duration);
    const noiseBuf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const data = noiseBuf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuf;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(freq * 1.9, now);
    bp.Q.setValueAtTime(4.5, now);
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0.0001, now);
    ng.gain.linearRampToValueAtTime(0.11, now + 0.05);
    ng.gain.exponentialRampToValueAtTime(0.0001, now + Math.min(0.45, duration));

    noise.connect(bp);
    bp.connect(ng);
    ng.connect(ctx.destination);
    noise.start(now);
  }

  public stopMelody(): void {
    this.melodyTimeouts.forEach((t) => clearTimeout(t));
    this.melodyTimeouts = [];
  }

  public playMelody(
    type: 'bianzhong' | 'sheng' | 'paixiao',
    notes: Array<{ freq: number; altFreq?: number; chord?: number[] }>,
    sequence: Array<{ noteIndex: number; delayMs: number; useAlt?: boolean }>,
    onStep?: (noteIndex: number | null) => void
  ): void {
    this.stopMelody();
    let maxDelay = 0;
    sequence.forEach((step) => {
      if (step.delayMs > maxDelay) maxDelay = step.delayMs;
      const t = window.setTimeout(() => {
        const note = notes[step.noteIndex];
        if (!note) return;
        onStep?.(step.noteIndex);
        if (type === 'bianzhong') {
          this.playBianzhong(step.useAlt && note.altFreq ? note.altFreq : note.freq, Boolean(step.useAlt));
        } else if (type === 'sheng') {
          this.playSheng(note.chord || [note.freq, note.freq * 1.498]);
        } else {
          this.playPaixiao(note.freq);
        }
      }, step.delayMs);
      this.melodyTimeouts.push(t);
    });
    const endTimer = window.setTimeout(() => onStep?.(null), maxDelay + 900);
    this.melodyTimeouts.push(endTimer);
  }

  /** Tactile muffled vermilion seal stamp sound */
  public playSealStamp(): void {
    const ctx = this.ensureContext();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(145, now);
    osc.frequency.exponentialRampToValueAtTime(48, now + 0.11);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.28, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.16);
  }

  /** Delicate jade/wood hover tick for AAA game menu feel */
  public playUiHover(): void {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1320, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.035);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.028, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.045);
  }

  /** Crisp bronze chime confirm when entering a mode or selecting a relic */
  public playUiConfirm(): void {
    const ctx = this.ensureContext();
    const now = ctx.currentTime;
    [523.25, 783.99].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, now);
      g.gain.linearRampToValueAtTime(i === 0 ? 0.09 : 0.045, now + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.6);
    });
  }

  /** Deep ceremonial drum + gold shimmer when summoning a new relic onto the 3D altar */
  public playRelicSummon(): void {
    const ctx = this.ensureContext();
    const now = ctx.currentTime;

    // Low resonance thump
    const sub = ctx.createOscillator();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(110, now);
    sub.frequency.exponentialRampToValueAtTime(46, now + 0.28);
    const sg = ctx.createGain();
    sg.gain.setValueAtTime(0.18, now);
    sg.gain.exponentialRampToValueAtTime(0.0001, now + 0.34);
    sub.connect(sg);
    sg.connect(ctx.destination);
    sub.start(now);
    sub.stop(now + 0.38);

    // Subtle metallic bronze shimmer
    const chime = ctx.createOscillator();
    chime.type = 'triangle';
    chime.frequency.setValueAtTime(659.25, now + 0.04);
    const cg = ctx.createGain();
    cg.gain.setValueAtTime(0.0001, now + 0.04);
    cg.gain.linearRampToValueAtTime(0.055, now + 0.06);
    cg.gain.exponentialRampToValueAtTime(0.0001, now + 0.72);
    chime.connect(cg);
    cg.connect(ctx.destination);
    chime.start(now + 0.04);
    chime.stop(now + 0.76);
  }
}

export const soundEngine = new MuseumSoundEngine();

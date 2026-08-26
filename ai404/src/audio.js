// Procedural WebAudio: no external assets needed.
export class AudioSys {
  constructor() {
    this.ctx = null;
    this.alarmOn = false;
  }

  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.5;
    this.master.connect(this.ctx.destination);

    // ambient hum: two detuned low oscillators + slow LFO
    const humGain = this.ctx.createGain();
    humGain.gain.value = 0.05;
    humGain.connect(this.master);
    [55, 55.7].forEach((f) => {
      const o = this.ctx.createOscillator();
      o.type = "sine";
      o.frequency.value = f;
      o.connect(humGain);
      o.start();
    });
    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = 0.1;
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 0.02;
    lfo.connect(lfoGain);
    lfoGain.connect(humGain.gain);
    lfo.start();

    this.noiseBuf = this._makeNoise();
  }

  _makeNoise() {
    const len = this.ctx.sampleRate * 1;
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  _tone(freq, dur, type = "square", vol = 0.08, when = 0) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + when;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  beep() { this._tone(880, 0.07); }
  keyBeep() { this._tone(660, 0.05, "sine", 0.06); }
  nexusBlip() { this._tone(1244, 0.09, "sine", 0.05); this._tone(932, 0.09, "sine", 0.04, 0.09); }
  error() {
    this._tone(160, 0.25, "sawtooth", 0.12);
    this._tone(120, 0.3, "sawtooth", 0.1, 0.12);
  }
  success() {
    [523, 659, 784].forEach((f, i) => this._tone(f, 0.12, "sine", 0.08, i * 0.1));
  }
  doorWhoosh() {
    if (!this.ctx) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const g = this.ctx.createGain();
    const f = this.ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.setValueAtTime(300, this.ctx.currentTime);
    f.frequency.exponentialRampToValueAtTime(1200, this.ctx.currentTime + 0.3);
    g.gain.setValueAtTime(0.15, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.5);
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start();
  }

  startAlarm() {
    if (!this.ctx || this.alarmOn) return;
    this.alarmOn = true;
    const loop = () => {
      if (!this.alarmOn) return;
      this._tone(440, 0.4, "triangle", 0.04);
      this._tone(330, 0.4, "triangle", 0.04, 0.5);
      setTimeout(loop, 2000);
    };
    loop();
  }
}

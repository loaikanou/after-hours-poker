/**
 * Tiny Web Audio synthesizer for table sounds. Everything is generated on the
 * fly, so there are no audio files to download or cache. Browsers only allow
 * audio after a user gesture, so the context is created lazily and resumed on
 * the first pointer/key press.
 */

export type SoundName =
  | "card" | "deal" | "chip" | "chips" | "check" | "fold" | "turn" | "win" | "lose"
  | "tick" | "select" | "join" | "error" | "sweep" | "flip";

let context: AudioContext | null = null;
let master: GainNode | null = null;
let noise: AudioBuffer | null = null;
let enabled = true;

function audio(): AudioContext | null {
  if (typeof window === "undefined" || !("AudioContext" in window)) return null;
  if (!context) {
    context = new AudioContext();
    master = context.createGain();
    master.gain.value = 0.55;
    master.connect(context.destination);
  }
  if (context.state === "suspended") void context.resume();
  return context;
}

function noiseBuffer(ac: AudioContext): AudioBuffer {
  if (!noise) {
    noise = ac.createBuffer(1, ac.sampleRate * 0.5, ac.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  return noise;
}

function envelope(ac: AudioContext, at: number, peak: number, attack: number, decay: number): GainNode {
  const gain = ac.createGain();
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(peak, at + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + attack + decay);
  gain.connect(master!);
  return gain;
}

function tone(ac: AudioContext, at: number, frequency: number, { type = "sine", peak = 0.3, attack = 0.005, decay = 0.18, slideTo }: {
  type?: OscillatorType; peak?: number; attack?: number; decay?: number; slideTo?: number;
} = {}) {
  const osc = ac.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, at);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, at + attack + decay);
  osc.connect(envelope(ac, at, peak, attack, decay));
  osc.start(at);
  osc.stop(at + attack + decay + 0.02);
}

function hiss(ac: AudioContext, at: number, { filter = "bandpass", frequency = 3000, q = 1.2, peak = 0.35, attack = 0.002, decay = 0.06, sweepTo }: {
  filter?: BiquadFilterType; frequency?: number; q?: number; peak?: number; attack?: number; decay?: number; sweepTo?: number;
} = {}) {
  const source = ac.createBufferSource();
  source.buffer = noiseBuffer(ac);
  const biquad = ac.createBiquadFilter();
  biquad.type = filter;
  biquad.frequency.setValueAtTime(frequency, at);
  if (sweepTo) biquad.frequency.exponentialRampToValueAtTime(sweepTo, at + attack + decay);
  biquad.Q.value = q;
  source.connect(biquad).connect(envelope(ac, at, peak, attack, decay));
  source.start(at, Math.random() * 0.3);
  source.stop(at + attack + decay + 0.02);
}

const recipes: Record<SoundName, (ac: AudioContext, t: number) => void> = {
  card: (ac, t) => hiss(ac, t, { frequency: 2600 + Math.random() * 800, decay: 0.07, peak: 0.4 }),
  flip: (ac, t) => { hiss(ac, t, { frequency: 1800, decay: 0.05, peak: 0.3 }); hiss(ac, t + 0.06, { frequency: 3200, decay: 0.05, peak: 0.25 }); },
  deal: (ac, t) => { for (let i = 0; i < 4; i++) hiss(ac, t + i * 0.085, { frequency: 2400 + i * 300, decay: 0.06, peak: 0.32 }); },
  chip: (ac, t) => { tone(ac, t, 3400, { type: "triangle", peak: 0.12, decay: 0.05 }); tone(ac, t + 0.035, 2600, { type: "triangle", peak: 0.1, decay: 0.06 }); },
  chips: (ac, t) => { for (let i = 0; i < 5; i++) tone(ac, t + i * 0.045 + Math.random() * 0.02, 2400 + Math.random() * 1400, { type: "triangle", peak: 0.09, decay: 0.05 }); },
  check: (ac, t) => { tone(ac, t, 190, { peak: 0.5, decay: 0.08, slideTo: 90 }); tone(ac, t + 0.12, 190, { peak: 0.45, decay: 0.08, slideTo: 90 }); },
  fold: (ac, t) => hiss(ac, t, { filter: "lowpass", frequency: 2400, sweepTo: 300, attack: 0.02, decay: 0.26, peak: 0.3 }),
  sweep: (ac, t) => hiss(ac, t, { filter: "bandpass", frequency: 900, sweepTo: 3200, attack: 0.03, decay: 0.22, peak: 0.25 }),
  turn: (ac, t) => { tone(ac, t, 880, { peak: 0.18, decay: 0.22 }); tone(ac, t + 0.12, 1318.5, { peak: 0.16, decay: 0.32 }); },
  select: (ac, t) => tone(ac, t, 660, { type: "sine", peak: 0.15, decay: 0.1, slideTo: 990 }),
  join: (ac, t) => { tone(ac, t, 523.3, { peak: 0.12, decay: 0.14 }); tone(ac, t + 0.09, 784, { peak: 0.12, decay: 0.2 }); },
  tick: (ac, t) => tone(ac, t, 1500, { type: "square", peak: 0.04, decay: 0.03 }),
  error: (ac, t) => tone(ac, t, 150, { type: "sawtooth", peak: 0.08, decay: 0.16 }),
  win: (ac, t) => {
    [523.3, 659.3, 784, 1046.5].forEach((f, i) => tone(ac, t + i * 0.1, f, { type: "triangle", peak: 0.2, decay: 0.35 }));
    for (let i = 0; i < 6; i++) tone(ac, t + 0.45 + i * 0.05, 2600 + Math.random() * 1200, { type: "triangle", peak: 0.06, decay: 0.05 });
  },
  lose: (ac, t) => { tone(ac, t, 392, { type: "triangle", peak: 0.16, decay: 0.25 }); tone(ac, t + 0.2, 311.1, { type: "triangle", peak: 0.15, decay: 0.4 }); },
};

export function play(name: SoundName, delayMs = 0) {
  if (!enabled) return;
  const ac = audio();
  if (!ac || !master) return;
  try { recipes[name](ac, ac.currentTime + delayMs / 1000); } catch { /* audio is best-effort */ }
}

export function setSoundEnabled(value: boolean) {
  enabled = value;
}

/** Light haptic feedback on phones that support it. */
export function buzz(pattern: number | number[] = 25) {
  if (enabled && typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(pattern);
}

/** Browsers block audio until a gesture; warm the context up on the first one. */
export function unlockAudioOnGesture() {
  const unlock = () => { if (enabled) audio(); window.removeEventListener("pointerdown", unlock); window.removeEventListener("keydown", unlock); };
  window.addEventListener("pointerdown", unlock);
  window.addEventListener("keydown", unlock);
}

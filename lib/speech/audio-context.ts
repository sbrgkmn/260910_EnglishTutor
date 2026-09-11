// One page-scoped audio context, activated by the Start/Speak tap and reused
// between teacher playback and microphone analysis. Microphone tracks are still
// stopped after every answer; no student audio is buffered or stored here.
let context: AudioContext | undefined;
let constructor: typeof AudioContext | undefined;

export function sharedAudioContext(): AudioContext | undefined {
  if (typeof window === "undefined") return undefined;
  const AudioContextClass = window.AudioContext ||
    (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return undefined;
  if (!context || context.state === "closed" || constructor !== AudioContextClass) {
    context = new AudioContextClass();
    constructor = AudioContextClass;
  }
  return context;
}

export function activateAudioContext() {
  try {
    const audio = sharedAudioContext();
    if (!audio) return;
    // Called synchronously from a user gesture, never from a timer/effect.
    if (audio.state !== "running") void audio.resume().catch(() => {});
  } catch {
    // The next explicit playback/listening request reports an actionable error.
  }
}

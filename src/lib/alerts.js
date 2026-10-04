export function playChime() {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext
    if (!AudioContextClass) return
    const context = new AudioContextClass()
    const notes = [660, 880]
    notes.forEach((frequency, index) => {
      const oscillator = context.createOscillator()
      const gain = context.createGain()
      const start = context.currentTime + index * 0.13
      oscillator.type = 'sine'
      oscillator.frequency.value = frequency
      gain.gain.setValueAtTime(0.0001, start)
      gain.gain.exponentialRampToValueAtTime(0.13, start + 0.015)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.24)
      oscillator.connect(gain).connect(context.destination)
      oscillator.start(start)
      oscillator.stop(start + 0.25)
    })
    window.setTimeout(() => context.close(), 800)
  } catch {
    // Some browsers block audio until the user interacts with the page.
  }
}

export function notifyCandle(timeframe, soundEnabled) {
  if (soundEnabled) playChime()
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(`${timeframe} candle started`, { body: 'Log your MGC bias for the new candle.' })
  }
}

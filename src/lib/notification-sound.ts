/**
 * Som característico da Luku para notificações novas (Fase N4) — dois tons
 * curtos e ascendentes, sintetizados via Web Audio API. Sem ficheiro de
 * áudio nenhum a carregar/publicar — mais leve, e dá para trocar por um som
 * produzido a sério mais tarde só mudando esta função, sem tocar em quem a
 * chama.
 *
 * Nota: a política de autoplay dos browsers só deixa som tocar depois de
 * uma interação genuína do utilizador na página — antes disso, `resume()`
 * fica pendente e o som não toca. Não há como contornar isto (nem se
 * deveria); é o mesmo comportamento de qualquer som de notificação no web.
 */
let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  audioCtx ??= new Ctor();
  return audioCtx;
}

export function playNotificationSound(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    if (ctx.state === "suspended") void ctx.resume();
    const now = ctx.currentTime;
    const notes: Array<[freq: number, start: number]> = [
      [880, now],
      [1320, now + 0.09],
    ];
    for (const [freq, start] of notes) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.2, start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.16);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.18);
    }
  } catch {
    // Som é um extra — nunca deixar um erro aqui incomodar o resto da app.
  }
}

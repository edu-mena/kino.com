// Gera capacitor/assets/notification_luku.wav — um WAV curto (dois tons,
// 880Hz -> 1320Hz), mesmo som sintetizado do lado web
// (src/lib/notification-sound.ts), agora como ficheiro para o canal de
// notificação nativo do Android (precisa de um recurso de áudio real, não dá
// para sintetizar em runtime como no browser). Corre com
// `node scripts/generate-notification-sound.mjs` sempre que quiseres
// mudar o som — o ficheiro gerado é o que capacitor/README.md manda copiar
// para `android/app/src/main/res/raw/` (esse `android/` está no
// .gitignore, regenera-se com `npx cap add android`).
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const SAMPLE_RATE = 44100;
const notes = [
  { freq: 880, start: 0.0, dur: 0.16 },
  { freq: 1320, start: 0.09, dur: 0.16 },
];
const totalDur = 0.3;
const numSamples = Math.ceil(SAMPLE_RATE * totalDur);
const samples = new Float64Array(numSamples);

for (const { freq, start, dur } of notes) {
  const startSample = Math.floor(start * SAMPLE_RATE);
  const endSample = Math.min(numSamples, Math.floor((start + dur) * SAMPLE_RATE));
  for (let i = startSample; i < endSample; i++) {
    const t = (i - startSample) / SAMPLE_RATE;
    const durLocal = dur;
    // Envelope: sobe rápido (15ms), decai exponencialmente até quase zero.
    const attack = 0.015;
    let amp;
    if (t < attack) {
      amp = 0.2 * (t / attack);
    } else {
      const decayT = t - attack;
      const decayDur = durLocal - attack;
      amp = 0.2 * Math.exp(-6 * (decayT / decayDur));
    }
    samples[i] += amp * Math.sin(2 * Math.PI * freq * t);
  }
}

// PCM 16-bit mono WAV.
const bytesPerSample = 2;
const dataSize = numSamples * bytesPerSample;
const buffer = Buffer.alloc(44 + dataSize);

buffer.write("RIFF", 0);
buffer.writeUInt32LE(36 + dataSize, 4);
buffer.write("WAVE", 8);
buffer.write("fmt ", 12);
buffer.writeUInt32LE(16, 16);
buffer.writeUInt16LE(1, 20); // PCM
buffer.writeUInt16LE(1, 22); // mono
buffer.writeUInt32LE(SAMPLE_RATE, 24);
buffer.writeUInt32LE(SAMPLE_RATE * bytesPerSample, 28);
buffer.writeUInt16LE(bytesPerSample, 32);
buffer.writeUInt16LE(16, 34);
buffer.write("data", 36);
buffer.writeUInt32LE(dataSize, 40);

for (let i = 0; i < numSamples; i++) {
  const clamped = Math.max(-1, Math.min(1, samples[i]));
  buffer.writeInt16LE(Math.round(clamped * 32767), 44 + i * bytesPerSample);
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outPath =
  process.argv[2] ?? path.join(__dirname, "..", "capacitor", "assets", "notification_luku.wav");
writeFileSync(outPath, buffer);
console.log(`Escrito: ${outPath} (${buffer.length} bytes, ${totalDur}s)`);

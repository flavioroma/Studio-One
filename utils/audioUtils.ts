/**
 * Encode an AudioBuffer as a WAV ArrayBuffer (PCM 16-bit).
 * Extracted from AudioTrimTool so both export and cross-tool helpers can reuse it.
 */
export const bufferToWav = (buffer: AudioBuffer): ArrayBuffer => {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;

  const length = buffer.length * numChannels * 2 + 44;
  const arrayBuffer = new ArrayBuffer(length);
  const view = new DataView(arrayBuffer);

  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + buffer.length * numChannels * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * 2, true);
  view.setUint16(32, numChannels * 2, true);
  view.setUint16(34, bitDepth, true);
  writeString(36, 'data');
  view.setUint32(40, buffer.length * numChannels * 2, true);

  const offset = 44;
  for (let i = 0; i < buffer.length; i++) {
    for (let channel = 0; channel < numChannels; channel++) {
      const sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[i]));
      view.setInt16(
        offset + (i * numChannels + channel) * 2,
        sample < 0 ? sample * 0x8000 : sample * 0x7fff,
        true
      );
    }
  }

  return arrayBuffer;
};

/**
 * Render the trimmed segment of an audio file as a WAV File object.
 * Reuses the same OfflineAudioContext + bufferToWav pipeline as AudioTrimTool's export.
 */
export const renderTrimmedAudioToFile = async (
  sourceFile: File,
  startTime: number,
  endTime: number
): Promise<File> => {
  const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  const arrayBuffer = await sourceFile.arrayBuffer();
  const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
  await audioCtx.close();

  const frameStart = Math.floor(startTime * audioBuffer.sampleRate);
  const frameEnd = Math.floor(endTime * audioBuffer.sampleRate);
  const frameCount = frameEnd - frameStart;

  const offlineCtx = new OfflineAudioContext(
    audioBuffer.numberOfChannels,
    frameCount,
    audioBuffer.sampleRate
  );

  const source = offlineCtx.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(offlineCtx.destination);
  source.start(0, startTime, endTime - startTime);

  const renderedBuffer = await offlineCtx.startRendering();
  const wavData = bufferToWav(renderedBuffer);
  const blob = new Blob([wavData], { type: 'audio/wav' });

  const baseName = sourceFile.name.replace(/\.[^/.]+$/, '');
  return new File([blob], `${baseName}_trimmed.wav`, { type: 'audio/wav' });
};

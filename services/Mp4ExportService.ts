import * as Mp4Muxer from "mp4-muxer";
import { Slide, TextPosition, TextSize, TextColor, AspectRatio, Rotation, AudioMode } from "../types";
import { calculateCaptionMetrics, calculateCaptionPosition, calculateWatermarkPosition } from "../utils/captionUtils";

export interface OverlayConfig {
    text: string;
    color: TextColor;
    position: TextPosition;
    textSize: TextSize;
    isItalic?: boolean;
    watermark?: {
        file: File;
        position: TextPosition;
        scale: number;
        opacity: number;
    };
    rotation?: Rotation;
    audioMode?: AudioMode;
    audioFile?: File | null;
    startTime?: number;
    endTime?: number;
}

interface ExportConfig {
    width: number;
    height: number;
    fps: number;
    audioFile: File | null;
}

export class Mp4ExportService {
    private ctx: CanvasRenderingContext2D;
    private canvas: OffscreenCanvas;

    constructor() {
        // We create the canvas during export to allow variable sizing
        this.canvas = new OffscreenCanvas(1920, 1080);
        this.ctx = this.canvas.getContext("2d", { alpha: false }) as unknown as CanvasRenderingContext2D;
    }

    async export(slides: Slide[], config: ExportConfig, onProgress: (progress: number) => void): Promise<Blob> {
        const { width, height, fps, audioFile } = config;
        this.canvas.width = width;
        this.canvas.height = height;

        // 1. Prepare Audio
        let audioBuffer: AudioBuffer | null = null;
        let audioDuration = 0;

        if (audioFile) {
            const audioCtx = new AudioContext();
            const arrayBuffer = await audioFile.arrayBuffer();
            audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
            audioDuration = audioBuffer.duration;
            audioCtx.close();
        }

        if (!audioBuffer && slides.length > 0) {
            // Fallback if no audio (though usually required) - e.g. 5 secons per slide
            audioDuration = slides.length * 5;
        }

        // 2. Setup Muxer
        const muxer = new Mp4Muxer.Muxer({
            target: new Mp4Muxer.ArrayBufferTarget(),
            video: {
                codec: 'avc', // H.264
                width,
                height
            },
            audio: audioBuffer ? {
                codec: 'aac',
                numberOfChannels: audioBuffer.numberOfChannels,
                sampleRate: audioBuffer.sampleRate
            } : undefined,
            firstTimestampBehavior: 'offset',
            fastStart: 'in-memory'
        });

        // 3. Setup Video Encoder
        const videoEncoder = new VideoEncoder({
            output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
            error: (e) => console.error("VideoEncoder error:", e)
        });

        videoEncoder.configure({
            codec: 'avc1.4d002a', // H.264 High Profile
            width,
            height,
            bitrate: 8_000_000, // 8 Mbps
            framerate: fps
        });

        // 4. Setup Audio Encoder
        let audioEncoder: AudioEncoder | null = null;
        if (audioBuffer) {
            audioEncoder = new AudioEncoder({
                output: (chunk, meta) => muxer.addAudioChunk(chunk, meta),
                error: (e) => console.error("AudioEncoder error:", e)
            });

            audioEncoder.configure({
                codec: 'mp4a.40.2', // AAC LC
                numberOfChannels: audioBuffer.numberOfChannels,
                sampleRate: audioBuffer.sampleRate,
                bitrate: 128_000
            });
        }

        // 5. Render Video Frames
        const totalFrames = Math.ceil(audioDuration * fps);
        const slideDuration = audioDuration / slides.length;

        // Load all images first
        const images = await Promise.all(slides.map(s => this.loadImage(s.previewUrl)));

        for (let i = 0; i < totalFrames; i++) {
            const time = i / fps;
            const slideIndex = Math.min(
                Math.floor(time / slideDuration),
                slides.length - 1
            );

            this.renderFrame(images[slideIndex], slides[slideIndex], width, height);

            // Create VideoFrame from canvas
            const frame = new VideoFrame(this.canvas, { timestamp: i * (1_000_000 / fps) }); // microseconds

            // Encode
            // Keyframe every 2 seconds
            const keyFrame = i % (fps * 2) === 0;
            videoEncoder.encode(frame, { keyFrame });
            frame.close();

            // Report progress
            if (i % 30 === 0) onProgress(i / totalFrames);

            // Yield to event loop to keep UI responsive
            await new Promise(r => setTimeout(r, 0));
        }

        // 6. Encode Audio
        if (audioEncoder && audioBuffer) {
            // We need to feed AudioData objects to the encoder
            // This is complex b/c AudioData expects planar data in specific format.
            // Simplified approach: encode the whole buffer

            // NOTE: Creating AudioData from AudioBuffer is not direct.
            // We iterate audioBuffer and create AudioData chunks.
            // Usually 10ms-20ms chunks.
            const numberOfChannels = audioBuffer.numberOfChannels;
            const length = audioBuffer.length; // samples
            const sampleRate = audioBuffer.sampleRate;

            // Chunk size: e.g. 1 second (too big?) or 4096 samples?
            // AAC frame size is usually 1024 samples. Let's send bigger chunks, encoder handles it.
            // But AudioData has limits. Let's do ~0.5s chunks.
            const chunkSize = Math.floor(sampleRate / 2);

            for (let offset = 0; offset < length; offset += chunkSize) {
                const size = Math.min(chunkSize, length - offset);
                const duration = (size / sampleRate) * 1_000_000; // micro
                const timestamp = (offset / sampleRate) * 1_000_000;

                // Create AudioData
                // For >1 channels, AudioData expects interleaved or planar? 
                // format: 'f32-planar' means float32, separate planes. AudioBuffer getChannelData returns float32 planes.
                // We need to construct the buffer.

                const destBuffer = new Float32Array(size * numberOfChannels);
                // Copy data. AudioData expects planar for 'f32-planar' ? MDN says "f32" is interleaved, "f32-planar" is planar.
                // AudioBuffer is planar (getChannelData(0), getChannelData(1)).
                // New AudioData init: { format: 'f32-planar', data: ..., numberOfChannels: ..., numberOfFrames: ... }
                // The data buffer must contain all planes concatenated.

                for (let ch = 0; ch < numberOfChannels; ch++) {
                    const channelData = audioBuffer.getChannelData(ch);
                    // Copy specific segment
                    const segment = channelData.subarray(offset, offset + size);
                    destBuffer.set(segment, ch * size); // Planar layout: Ch1[...], Ch2[...]
                }

                const audioData = new AudioData({
                    format: 'f32-planar',
                    sampleRate,
                    numberOfFrames: size,
                    numberOfChannels,
                    timestamp, // micros
                    data: destBuffer
                });

                audioEncoder.encode(audioData);
                audioData.close();
            }
        }

        // 7. Flush and Finalize
        await videoEncoder.flush();
        if (audioEncoder) await audioEncoder.flush();
        muxer.finalize();

        const { buffer } = muxer.target;
        return new Blob([buffer], { type: 'video/mp4' });
    }

    private renderFrame(img: HTMLImageElement, slide: Slide, width: number, height: number) {
        const ctx = this.ctx;
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, width, height);

        // Draw Image (same logic as VideoPreview)
        const zoom = slide.zoom || 1.0;
        const offsetX = slide.offsetX || 0;
        const offsetY = slide.offsetY || 0;

        const baseScale = Math.min(width / img.width, height / img.height);
        const finalScale = baseScale * zoom;
        const w = img.width * finalScale;
        const h = img.height * finalScale;

        const baseX = (width - w) / 2;
        const baseY = (height - h) / 2;

        const userX = (offsetX / 100) * width;
        const userY = (offsetY / 100) * height;

        ctx.drawImage(img, baseX + userX, baseY + userY, w, h);

        // Draw Text using shared logic
        // Note: Slide interface doesn't strictly match OverlayConfig but similar enough for renderOverlay?
        // Actually Slide is slightly different. Let's make a shim.
        this.renderOverlay(ctx, width, height, {
            text: slide.text,
            color: slide.color,
            position: slide.position,
            textSize: slide.textSize,
            isItalic: slide.isItalic,
            // Slides don't have watermark yet?
        });
    }

    private loadImage(url: string): Promise<HTMLImageElement> {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = url;
        });
    }

    async exportVideoWithOverlay(
        videoFile: File,
        overlay: OverlayConfig,
        onProgress: (progress: number) => void,
        signal?: AbortSignal
    ): Promise<Blob> {
        // 1. Prepare Video Element for Decoding
        const video = document.createElement('video');
        video.src = URL.createObjectURL(videoFile);
        video.muted = true;
        video.playsInline = true;

        await new Promise<void>((resolve) => {
            video.onloadedmetadata = () => resolve();
        });

        let width = video.videoWidth;
        let height = video.videoHeight;

        if (overlay.rotation === Rotation.CW_90 || overlay.rotation === Rotation.CCW_90) {
            width = video.videoHeight;
            height = video.videoWidth;
        }

        const duration = overlay.endTime || video.duration;
        const startOffset = overlay.startTime || 0;
        const fps = 30; // Target 30 FPS for export

        this.canvas.width = width;
        this.canvas.height = height;

        // 2. Prepare Audio
        let audioBuffer: AudioBuffer | null = null;
        let audioCtx: AudioContext | null = null;

        if (overlay.audioMode !== AudioMode.Remove) {
            audioCtx = new AudioContext();
            try {
                let arrayBuffer: ArrayBuffer;
                if (overlay.audioMode === AudioMode.Replace && overlay.audioFile) {
                    arrayBuffer = await overlay.audioFile.arrayBuffer();
                } else {
                    arrayBuffer = await videoFile.arrayBuffer();
                }
                audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
            } catch (err) {
                console.error("Failed to decode audio", err);
                audioBuffer = null;
            }
        }

        // 3. Setup Muxer & Video Encoder
        const muxer = new Mp4Muxer.Muxer({
            target: new Mp4Muxer.ArrayBufferTarget(),
            video: {
                codec: 'avc',
                width,
                height
            },
            audio: audioBuffer ? {
                codec: 'aac',
                numberOfChannels: audioBuffer.numberOfChannels,
                sampleRate: audioBuffer.sampleRate
            } : undefined,
            firstTimestampBehavior: 'offset',
            fastStart: 'in-memory'
        });

        const videoEncoder = new VideoEncoder({
            output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
            error: (e) => console.error("VideoEncoder error:", e)
        });

        videoEncoder.configure({
            codec: 'avc1.4d002a', // H.264 High Profile
            width,
            height,
            bitrate: 8_000_000, // 8 Mbps - High Quality
            framerate: fps
        });

        // 4. Setup Audio Encoder
        let audioEncoder: AudioEncoder | null = null;
        if (audioBuffer) {
            audioEncoder = new AudioEncoder({
                output: (chunk, meta) => muxer.addAudioChunk(chunk, meta),
                error: (e) => console.error("AudioEncoder error:", e)
            });

            audioEncoder.configure({
                codec: 'mp4a.40.2',
                numberOfChannels: audioBuffer.numberOfChannels,
                sampleRate: audioBuffer.sampleRate,
                bitrate: 192_000 // 192 kbps audio
            });
        }

        // 5. Pre-load Watermark if exists
        let watermarkImg: HTMLImageElement | null = null;
        if (overlay.watermark) {
            const url = URL.createObjectURL(overlay.watermark.file);
            watermarkImg = await this.loadImage(url);
            URL.revokeObjectURL(url);
        }

        // 6. Process Frames
        const exportDuration = duration - startOffset;
        const totalFrames = Math.ceil(exportDuration * fps);
        const ctx = this.ctx;

        try {
            for (let i = 0; i < totalFrames; i++) {
                if (signal?.aborted) {
                    throw new DOMException('Export aborted', 'AbortError');
                }

                const time = startOffset + (i / fps);

                // Allow seek to complete
                video.currentTime = time;
                await new Promise<void>(resolve => {
                    const onSeeked = () => {
                        video.removeEventListener('seeked', onSeeked);
                        resolve();
                    };
                    video.addEventListener('seeked', onSeeked, { once: true });
                });

                // Draw Video Header
                ctx.fillStyle = '#000000';
                ctx.fillRect(0, 0, width, height);

                // Handle Rotation & Aspect Ratio scaling
                ctx.save();
                ctx.translate(width / 2, height / 2);
                if (overlay.rotation) {
                    ctx.rotate((overlay.rotation * Math.PI) / 180);
                }

                // Determine scaling based on fit (object-contain)
                const rot = overlay.rotation || 0;
                let vW = video.videoWidth;
                let vH = video.videoHeight;
                if (rot % 180 !== 0) {
                    vW = video.videoHeight;
                    vH = video.videoWidth;
                }
                const scale = Math.min(width / vW, height / vH);

                const drawW = video.videoWidth * scale;
                const drawH = video.videoHeight * scale;

                ctx.drawImage(video, -drawW / 2, -drawH / 2, drawW, drawH);
                ctx.restore();

                // Draw Watermark
                if (watermarkImg && overlay.watermark) {
                    // Calculate size based on scale prop (percentage of container width)
                    const w = width * overlay.watermark.scale;
                    const aspectRatio = watermarkImg.width / watermarkImg.height;
                    const h = w / aspectRatio;

                    const pos = calculateWatermarkPosition(width, height, w, h, overlay.watermark.position);

                    // Apply opacity
                    ctx.globalAlpha = overlay.watermark.opacity;
                    ctx.drawImage(watermarkImg, pos.x, pos.y, w, h);
                    ctx.globalAlpha = 1.0; // Reset
                }

                // Draw Overlay
                this.renderOverlay(ctx, width, height, overlay);

                // Encode
                const frame = new VideoFrame(this.canvas, { timestamp: i * (1_000_000 / fps) });
                const keyFrame = i % (fps * 2) === 0; // Keyframe every 2s
                videoEncoder.encode(frame, { keyFrame });
                frame.close();

                // Progress
                if (i % 10 === 0) onProgress(i / totalFrames);

                // Yield
                await new Promise(r => setTimeout(r, 0));
            }

            // 7. Encode Audio
            if (audioEncoder && audioBuffer) {
                const numberOfChannels = audioBuffer.numberOfChannels;
                const sampleRate = audioBuffer.sampleRate;

                let startSample = 0;
                let endSample = audioBuffer.length;

                if (overlay.audioMode !== AudioMode.Replace) {
                    startSample = Math.floor(startOffset * sampleRate);
                    endSample = Math.floor(duration * sampleRate);
                } else {
                    endSample = Math.floor(exportDuration * sampleRate);
                }

                startSample = Math.max(0, Math.min(startSample, audioBuffer.length));
                endSample = Math.max(startSample, Math.min(endSample, audioBuffer.length));

                const length = endSample - startSample;
                const chunkSize = Math.floor(sampleRate / 10);

                for (let offset = 0; offset < length; offset += chunkSize) {
                    if (signal?.aborted) throw new DOMException('Export aborted', 'AbortError');

                    const size = Math.min(chunkSize, length - offset);
                    const timestamp = (offset / sampleRate) * 1_000_000;

                    const destBuffer = new Float32Array(size * numberOfChannels);
                    for (let ch = 0; ch < numberOfChannels; ch++) {
                        const channelData = audioBuffer.getChannelData(ch);
                        const segment = channelData.subarray(startSample + offset, startSample + offset + size);
                        destBuffer.set(segment, ch * size);
                    }

                    const audioData = new AudioData({
                        format: 'f32-planar',
                        sampleRate,
                        numberOfFrames: size,
                        numberOfChannels,
                        timestamp,
                        data: destBuffer
                    });

                    audioEncoder.encode(audioData);
                    audioData.close();
                }
            }

            // 8. Finish
            await videoEncoder.flush();
            if (audioEncoder) await audioEncoder.flush();
            muxer.finalize();

            const { buffer } = muxer.target;
            return new Blob([buffer], { type: 'video/mp4' });

        } catch (error) {
            // Cleanup on error
            video.src = "";
            video.load();
            if (audioCtx) audioCtx.close(); // Close audio context on error
            throw error;
        } finally {
            // Basic Cleanup
            video.src = "";
            video.load();
            // audioCtx.close() is already called in catch or will be GC'd if no error.
            // No need to call it again here.
        }
    }

    private renderOverlay(ctx: CanvasRenderingContext2D, width: number, height: number, overlay: OverlayConfig) {
        if (!overlay.text) return;

        const metrics = calculateCaptionMetrics(width, height, overlay);
        const position = calculateCaptionPosition(width, height, metrics, overlay.position);

        const fontStyle = overlay.isItalic ? 'italic' : 'normal';
        ctx.font = `${fontStyle} bold ${metrics.fontSize}px Inter, sans-serif`;
        ctx.fillStyle = overlay.color;

        ctx.shadowColor = 'rgba(0,0,0,0.8)';
        ctx.shadowBlur = 8;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;

        ctx.textAlign = position.textAlign as CanvasTextAlign;
        ctx.textBaseline = 'alphabetic';

        metrics.lines.forEach((line, i) => {
            ctx.fillText(line, position.x, position.y + (i * metrics.lineHeight));
        });
    }
}

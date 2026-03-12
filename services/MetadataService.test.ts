import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MetadataService } from './MetadataService';
import * as piexif from 'piexifjs';

// Mock piexifjs
vi.mock('piexifjs', () => ({
  load: vi.fn(),
  dump: vi.fn(),
  insert: vi.fn(),
  ExifIFD: {
    DateTimeOriginal: 36867,
    DateTimeDigitized: 36868,
    PixelXDimension: 40962,
    PixelYDimension: 40963,
  },
  GPSIFD: {
    GPSLatitude: 2,
    GPSLatitudeRef: 1,
    GPSLongitude: 4,
    GPSLongitudeRef: 3,
  },
  ImageIFD: {
    DateTime: 306,
    ImageWidth: 256,
    ImageLength: 257,
    Orientation: 274,
  },
}));

describe('MetadataService', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock URL.createObjectURL and revokeObjectURL
    global.URL.createObjectURL = vi.fn(() => 'mock-url');
    global.URL.revokeObjectURL = vi.fn();
  });

  describe('getPhotoMetadata', () => {
    it('extracts dimensions and date from EXIF', async () => {
      const mockFile = new File([], 'test.jpg');

      vi.mocked(piexif.load).mockReturnValue({
        '0th': { [piexif.ImageIFD.ImageWidth]: 1920, [piexif.ImageIFD.ImageLength]: 1080 },
        Exif: { [piexif.ExifIFD.DateTimeOriginal]: '2023:05:20 12:30:00' },
        GPS: {},
        '1st': {},
        Interop: {},
        thumbnail: null,
      });

      // Mock fileToDataURL
      vi.spyOn(MetadataService as any, 'fileToDataURL').mockResolvedValue(
        'data:image/jpeg;base64,...'
      );

      const metadata = await MetadataService.getPhotoMetadata(mockFile);

      expect(metadata.width).toBe(1920);
      expect(metadata.height).toBe(1080);
      expect(metadata.creationTime?.getFullYear()).toBe(2023);
      expect(metadata.creationTime?.getMonth()).toBe(4); // May
    });

    it('handles GPS coordinate conversion', async () => {
      const mockFile = new File([], 'test.jpg');

      vi.mocked(piexif.load).mockReturnValue({
        '0th': {},
        Exif: {},
        GPS: {
          [piexif.GPSIFD.GPSLatitude]: [
            [45, 1],
            [30, 1],
            [0, 1],
          ], // 45°30'0"
          [piexif.GPSIFD.GPSLatitudeRef]: 'N',
          [piexif.GPSIFD.GPSLongitude]: [
            [9, 1],
            [10, 1],
            [0, 1],
          ], // 9°10'0"
          [piexif.GPSIFD.GPSLongitudeRef]: 'E',
        },
        '1st': {},
        Interop: {},
        thumbnail: null,
      });

      vi.spyOn(MetadataService as any, 'fileToDataURL').mockResolvedValue(
        'data:image/jpeg;base64,...'
      );

      const metadata = await MetadataService.getPhotoMetadata(mockFile);

      expect(metadata.latitude).toBeCloseTo(45.5);
      expect(metadata.longitude).toBeCloseTo(9.1666, 3);
    });
  });

  describe('getVideoMetadata', () => {
    it('extracts duration and calculates bitrate', async () => {
      const mockFile = new File(['fake-video-content'], 'test.mp4');
      // mock size to 1MB (1,000,000 bytes)
      Object.defineProperty(mockFile, 'size', { value: 1000000 });

      // Mock document.createElement('video')
      const mockVideo = {
        duration: 10,
        videoWidth: 1280,
        videoHeight: 720,
        onloadedmetadata: null as any,
        set src(val: string) {
          // Simulate loading metadata
          setTimeout(() => this.onloadedmetadata(), 0);
        },
      };
      vi.spyOn(document, 'createElement').mockReturnValue(mockVideo as any);

      // Mock getMp4CreationTime to avoid binary parsing
      vi.spyOn(MetadataService as any, 'getMp4CreationTime').mockResolvedValue(
        new Date(2024, 0, 1)
      );

      const metadata = await MetadataService.getVideoMetadata(mockFile);

      expect(metadata.duration).toBe(10);
      expect(metadata.width).toBe(1280);
      expect(metadata.height).toBe(720);
      expect(metadata.bitrate).toBe(800000); // (1,000,000 * 8) / 10
      expect(metadata.creationTime?.getFullYear()).toBe(2024);
    });

    it('rejects if video metadata loading times out', async () => {
      const mockFile = new File(['fake-video-content'], 'test.mp4');
      vi.useFakeTimers();

      const mockVideo = {
        onloadedmetadata: null,
        onerror: null,
        set src(val: string) {
          // Do nothing, simulate a hang
        },
      };
      vi.spyOn(document, 'createElement').mockReturnValue(mockVideo as any);

      const metadataPromise = MetadataService.getVideoMetadata(mockFile);

      // Fast-forward 5.5 seconds
      vi.advanceTimersByTime(5500);

      await expect(metadataPromise).rejects.toMatch(/timed out/);
      vi.useRealTimers();
    });
  });
});

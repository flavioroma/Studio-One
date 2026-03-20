import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PersistenceService } from './PersistenceService';
import { get, set, clear } from 'idb-keyval';
import { TextColor, TextPosition, TextSize } from '../types';

// Mock idb-keyval
vi.mock('idb-keyval', () => ({
  get: vi.fn(),
  set: vi.fn(),
  clear: vi.fn(),
}));

describe('PersistenceService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('SlideSync', () => {
    const mockState = {
      slides: [],
      audioFile: null,
      aspectRatio: '16:9' as any,
    };

    it('saves SlideSync state', async () => {
      await PersistenceService.saveSlideSyncState(mockState);
      expect(set).toHaveBeenCalledWith('slidesync_state_v1', mockState);
    });

    it('loads SlideSync state', async () => {
      vi.mocked(get).mockResolvedValue(mockState);
      const state = await PersistenceService.loadSlideSyncState();
      expect(state).toEqual(mockState);
      expect(get).toHaveBeenCalledWith('slidesync_state_v1');
    });
  });

  describe('Videoverlay', () => {
    const mockVideoState = {
      file: null,
      caption: 'Overlay',
      color: TextColor.White,
      position: TextPosition.BottomLeft,
      textSize: TextSize.Small,
    };

    it('saves Videoverlay state', async () => {
      await PersistenceService.saveVideoverlayState(mockVideoState);
      expect(set).toHaveBeenCalledWith('videoverlay_state_v1', mockVideoState);
    });

    it('loads Videoverlay state', async () => {
      vi.mocked(get).mockResolvedValue(mockVideoState);
      const state = await PersistenceService.loadVideoverlayState();
      expect(state).toEqual(mockVideoState);
    });
  });

  describe('Photoverlay', () => {
    it('returns null if no state exists', async () => {
      vi.mocked(get).mockResolvedValue(null);
      const state = await PersistenceService.loadPhotoverlayState();
      expect(state).toBeNull();
    });
  });

  describe('AudioTrim', () => {
    const mockAudioState = {
      tracks: [
        {
          id: 'track1',
          file: new File([], 'audio.mp3'),
          startTime: 1,
          endTime: 5,
          exportFormat: 'wav' as const,
        },
      ],
      selectedId: 'track1',
    };

    it('saves AudioTrim state', async () => {
      await PersistenceService.saveAudioTrimState(mockAudioState);
      expect(set).toHaveBeenCalledWith('audiotrim_state_v1', mockAudioState);
    });

    it('loads AudioTrim state', async () => {
      vi.mocked(get).mockResolvedValue(mockAudioState);
      const state = await PersistenceService.loadAudioTrimState();
      expect(state).toEqual(mockAudioState);
    });

    it('returns null if no state exists', async () => {
      vi.mocked(get).mockResolvedValue(null);
      const state = await PersistenceService.loadAudioTrimState();
      expect(state).toBeNull();
    });

  });

  it('clears all state', async () => {
    await PersistenceService.clearState();
    expect(clear).toHaveBeenCalled();
  });
});

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
            aspectRatio: '16:9' as any
        };

        it('saves SlideSync state', async () => {
            await PersistenceService.saveState(mockState);
            expect(set).toHaveBeenCalledWith('slidesync_state_v1', mockState);
        });

        it('loads SlideSync state', async () => {
            vi.mocked(get).mockResolvedValue(mockState);
            const state = await PersistenceService.loadState();
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
            textSize: TextSize.Small
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

    describe('Photoverlay Migration', () => {
        it('migrates legacy photoverlay state', async () => {
            const legacyState = {
                file: new File([], 'test.jpg'),
                caption: 'Legacy Caption',
                color: TextColor.Red,
                position: TextPosition.TopLeft,
                textSize: TextSize.Large
            };

            vi.mocked(get).mockResolvedValue(legacyState);

            const state = await PersistenceService.loadPhotoverlayState();

            expect(state).not.toBeNull();
            expect(state?.items.length).toBe(1);
            expect(state?.items[0].caption).toBe('Legacy Caption');
            expect(state?.items[0].color).toBe(TextColor.Red);
            expect(state?.applyToAll).toBe(true);
        });

        it('returns null if no state exists', async () => {
            vi.mocked(get).mockResolvedValue(null);
            const state = await PersistenceService.loadPhotoverlayState();
            expect(state).toBeNull();
        });
    });

    it('clears all state', async () => {
        await PersistenceService.clearState();
        expect(clear).toHaveBeenCalled();
    });
});

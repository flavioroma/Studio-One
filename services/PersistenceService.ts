import { get, set, clear } from 'idb-keyval';
import { Slide, AspectRatio, TextPosition, TextColor, TextSize } from '../types';

const SLIDESYNC_KEY = 'slidesync_state_v1';
const VIDEOVERLAY_KEY = 'videoverlay_state_v1';
const PHOTOVERLAY_KEY = 'photoverlay_state_v1';
const MPTRIM_KEY = 'mptrim_state_v1';

export interface SlideSyncState {
    slides: Slide[];
    audioFile: File | null;
    aspectRatio: AspectRatio;
}

export interface VideoverlayState {
    file: File | null;
    caption: string;
    color: TextColor;
    position: TextPosition;
    textSize: TextSize;
    isItalic?: boolean;
    watermarkFile?: File | null;
    watermarkPosition?: TextPosition;
}

export interface PhotoverlayState {
    file: File | null;
    caption: string;
    color: TextColor;
    position: TextPosition;
    textSize: TextSize;
    isItalic?: boolean;
    watermarkFile?: File | null;
    watermarkPosition?: TextPosition;
}

export interface MPTrimState {
    file: File | null;
    startTime: number;
    endTime: number;
    exportFormat: 'wav' | 'mp3';
}

export class PersistenceService {
    // SlideSync
    static async saveState(state: SlideSyncState): Promise<void> {
        try {
            await set(SLIDESYNC_KEY, state);

        } catch (error) {
            console.error('Failed to save SlideSync state:', error);
        }
    }

    static async loadState(): Promise<SlideSyncState | null> {
        try {
            return (await get<SlideSyncState>(SLIDESYNC_KEY)) || null;
        } catch (error) {
            console.error('Failed to load SlideSync state:', error);
            return null;
        }
    }

    // Videoverlay
    static async saveVideoverlayState(state: VideoverlayState): Promise<void> {
        try {
            await set(VIDEOVERLAY_KEY, state);
        } catch (error) {
            console.error('Failed to save Videoverlay state:', error);
        }
    }

    static async loadVideoverlayState(): Promise<VideoverlayState | null> {
        try {
            return (await get<VideoverlayState>(VIDEOVERLAY_KEY)) || null;
        } catch (error) {
            console.error('Failed to load Videoverlay state:', error);
            return null;
        }
    }

    // Photoverlay
    static async savePhotoverlayState(state: PhotoverlayState): Promise<void> {
        try {
            await set(PHOTOVERLAY_KEY, state);
        } catch (error) {
            console.error('Failed to save Photoverlay state:', error);
        }
    }

    static async loadPhotoverlayState(): Promise<PhotoverlayState | null> {
        try {
            return (await get<PhotoverlayState>(PHOTOVERLAY_KEY)) || null;
        } catch (error) {
            console.error('Failed to load Photoverlay state:', error);
            return null;
        }
    }

    // MPTrim
    static async saveMPTrimState(state: MPTrimState): Promise<void> {
        try {
            await set(MPTRIM_KEY, state);
        } catch (error) {
            console.error('Failed to save MPTrim state:', error);
        }
    }

    static async loadMPTrimState(): Promise<MPTrimState | null> {
        try {
            return (await get<MPTrimState>(MPTRIM_KEY)) || null;
        } catch (error) {
            console.error('Failed to load MPTrim state:', error);
            return null;
        }
    }

    static async clearState(): Promise<void> {
        try {
            await clear();
        } catch (error) {
            console.error('Failed to clear state:', error);
        }
    }
}

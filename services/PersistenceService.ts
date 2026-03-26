import { get, set, clear } from 'idb-keyval';
import {
  Slide,
  AspectRatio,
  TextPosition,
  TextColor,
  TextSize,
  Rotation,
  AudioMode,
  NamingSettings,
  FramingSettings,
  WatermarkSettings,
  FilterMode,
  BorderSize,
} from '../types';

const SLIDESYNC_KEY = 'slidesync_state_v1';
const VIDEOVERLAY_KEY = 'videoverlay_state_v1';
const PHOTOVERLAY_KEY = 'photoverlay_state_v1';
const AUDIOTRIM_KEY = 'audiotrim_state_v1';
const PICOLLAGE_KEY = 'picollage_state_v1';

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
  aspectRatio?: AspectRatio;
  rotation?: Rotation;
  audioMode?: AudioMode;
  audioFile?: File | null;
  startTime?: number;
  endTime?: number;
  preserveVideoMetadata?: boolean;
}

export interface PhotoItemState {
  id: string;
  file: File;
  caption: string;
  color: TextColor;
  position: TextPosition;
  textSize: TextSize;
  isItalic?: boolean;
  watermarkFile?: File | null;
  watermarkPosition?: TextPosition;
  framingSettings?: FramingSettings;
  filter?: FilterMode;
  borderSize?: BorderSize;
  borderColor?: TextColor;
}

export interface PhotoverlayState {
  items: PhotoItemState[];
  selectedId: string | null;
  applyToAll: boolean;
  applyFilterToAll?: boolean;
  exportAsArchive?: boolean;
  namingSettings?: NamingSettings;
  preserveMetadata?: boolean;
  applyBorderToAll?: boolean;
}

export interface AudioTrackItem {
  id: string;
  file: File;
  startTime: number;
  endTime: number;
  exportFormat: 'wav' | 'mp3';
}

export interface AudioTrimState {
  tracks: AudioTrackItem[];
  selectedId: string | null;
}

export interface PiCollageState {
  pictures: import('../types').PiCollagePicture[];
  aspectRatio: AspectRatio;
  exportFormat: 'png' | 'jpg';
}

export class PersistenceService {
  // SlideSync
  static async saveSlideSyncState(state: SlideSyncState): Promise<void> {
    try {
      await set(SLIDESYNC_KEY, state);
    } catch (error) {
      console.error('Failed to save SlideSync state:', error);
    }
  }

  static async loadSlideSyncState(): Promise<SlideSyncState | null> {
    try {
      const state = await get<any>(SLIDESYNC_KEY);
      if (!state) return null;

      // Migration for old slides to new ImageItem format
      const migratedSlides = state.slides?.map((s: any) => {
        if (s.framingSettings) return s;
        return {
          ...s,
          previewUrl: s.previewUrl || s.imageUrl || '',
          framingSettings: {
            zoom: s.zoom || 1,
            offsetX: s.offsetX || 0,
            offsetY: s.offsetY || 0,
          },
          filterSettings: s.filter || FilterMode.Normal,
          borderSettings: {
            size: s.borderSize || BorderSize.None,
            color: s.borderColor || TextColor.White,
          },
          captionSettings: {
            text: s.text || '',
            color: s.color || TextColor.White,
            position: s.position || TextPosition.BottomLeft,
            textSize: s.textSize || TextSize.Small,
            isItalic: s.isItalic || false,
          },
          watermarkSettings: {
            file: s.watermarkFile || null,
            position: s.watermarkPosition || TextPosition.TopRight,
            opacity: s.watermarkOpacity || 0.2,
            scale: s.watermarkScale || 0.2,
          },
        };
      });

      return { ...state, slides: migratedSlides || [] } as SlideSyncState;
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
      const state = await get<any>(PHOTOVERLAY_KEY);
      if (!state) return null;

      const migratedItems = state.items?.map((s: any) => {
        if (s.framingSettings) return s;
        return {
          ...s,
          previewUrl: s.previewUrl || s.imageUrl || '',
          framingSettings: {
            zoom: s.zoom || 1,
            offsetX: s.offsetX || 0,
            offsetY: s.offsetY || 0,
          },
          filterSettings: s.filter || FilterMode.Normal,
          borderSettings: {
            size: s.borderSize || BorderSize.None,
            color: s.borderColor || TextColor.White,
          },
          captionSettings: {
            text: s.caption || s.text || '',
            color: s.color || TextColor.White,
            position: s.position || TextPosition.BottomLeft,
            textSize: s.textSize || TextSize.Small,
            isItalic: s.isItalic || false,
          },
          watermarkSettings: {
            file: s.watermarkFile || null,
            position: s.watermarkPosition || TextPosition.TopRight,
            opacity: s.watermarkOpacity || 0.2,
            scale: s.watermarkScale || 0.2,
          },
        };
      });

      return {
        ...state,
        items: migratedItems || [],
        namingSettings: state.namingSettings || {
          keepOriginal: true,
          type: 'prefix',
          value: '',
        },
      } as PhotoverlayState;
    } catch (error) {
      console.error('Failed to load Photoverlay state:', error);
      return null;
    }
  }

  // AudioTrim
  static async saveAudioTrimState(state: AudioTrimState): Promise<void> {
    try {
      await set(AUDIOTRIM_KEY, state);
    } catch (error) {
      console.error('Failed to save AudioTrim state:', error);
    }
  }

  static async loadAudioTrimState(): Promise<AudioTrimState | null> {
    try {
      const state = await get<AudioTrimState>(AUDIOTRIM_KEY);
      if (!state) return null;


      return state as AudioTrimState;
    } catch (error) {
      console.error('Failed to load AudioTrim state:', error);
      return null;
    }
  }

  // PiCollage
  static async savePiCollageState(state: PiCollageState): Promise<void> {
    try {
      await set(PICOLLAGE_KEY, state);
    } catch (error) {
      console.error('Failed to save PiCollage state:', error);
    }
  }

  static async loadPiCollageState(): Promise<PiCollageState | null> {
    try {
      const state = await get<any>(PICOLLAGE_KEY);
      if (!state) return null;

      const migratedPictures = state.pictures?.map((s: any) => {
        if (s.framingSettings) return s;
        return {
          ...s,
          previewUrl: s.previewUrl || s.imageUrl || '',
          framingSettings: {
            zoom: s.zoom || 1,
            offsetX: s.offsetX || 0,
            offsetY: s.offsetY || 0,
          },
          filterSettings: s.filter || FilterMode.Normal,
          borderSettings: {
            size: s.borderSize || BorderSize.None,
            color: s.borderColor || TextColor.White,
          },
          captionSettings: {
            text: s.caption || s.text || '',
            color: s.color || TextColor.White,
            position: s.position || TextPosition.BottomLeft,
            textSize: s.textSize || TextSize.Small,
            isItalic: s.isItalic || false,
          },
          watermarkSettings: {
            file: s.watermarkFile || null,
            position: s.watermarkPosition || TextPosition.TopRight,
            opacity: s.watermarkOpacity || 0.2,
            scale: s.watermarkScale || 0.2,
          },
        };
      });

      return { ...state, pictures: migratedPictures || [] } as unknown as PiCollageState;
    } catch (error) {
      console.error('Failed to load PiCollage state:', error);
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

export enum TextPosition {
  TopCenter = 'Top Center',
  TopLeft = 'Top Left',
  TopRight = 'Top Right',
  BottomCenter = 'Bottom Center',
  BottomLeft = 'Bottom Left',
  BottomRight = 'Bottom Right',
  Center = 'Center',
}

export enum TextSize {
  Small = 'Small',
  Large = 'Large',
}

export enum TextColor {
  // Row 1
  White = '#ffffff',
  LightGray = '#cbd5e1',
  DarkGray = '#334155',
  Black = '#000000',
  Yellow = '#eab308',
  Red = '#ef4444',
  Blue = '#3b82f6',
  Green = '#22c55e',
  Orange = '#f97316',
  Pink = '#ec4899',

  // Row 2
  Purple = '#a855f7',
  Cyan = '#06b6d4',
  Teal = '#14b8a6',
  Indigo = '#6366f1',
  Violet = '#8b5cf6',
  Fuchsia = '#d946ef',
  Rose = '#f43f5e',
  Amber = '#f59e0b',
  Lime = '#84cc16',
  Sky = '#0ea5e9',
}

export enum AspectRatio {
  Landscape_16_9 = '16:9',
  Portrait_9_16 = '9:16',
  Portrait_3_4 = '3:4',
  Square_1_1 = '1:1',
  Original = 'original',
}

export enum ExportFormat {
  WebM = 'video/webm',
  MP4 = 'video/mp4',
}

export enum Rotation {
  None = 0,
  CW_90 = 90,
  Half = 180,
  CCW_90 = 270,
}

export enum AudioMode {
  Keep = 'keep',
  Remove = 'remove',
  Replace = 'replace',
}

export interface FramingSettings {
  zoom: number; // 0.1 to 3.0. 1.0 is standard "fit" fit.
  offsetX: number; // -400 to 400 (percentage of offset from center)
  offsetY: number; // -400 to 400 (percentage of offset from center)
}

export interface Slide extends FramingSettings {
  id: string;
  file: File;
  previewUrl: string;
  text: string;
  color: TextColor;
  position: TextPosition;
  textSize: TextSize;
  isItalic?: boolean;
  watermarkSettings?: WatermarkSettings;
}

export interface VideoConfig {
  width: number;
  height: number;
  fps: number;
}

export interface CaptionSettings {
  text: string;
  color: TextColor;
  position: TextPosition;
  textSize: TextSize;
  isItalic?: boolean;
}

export interface WatermarkSettings {
  file: File | null;
  position: TextPosition;
  opacity: number;
  scale: number;
}

export interface NamingSettings {
  keepOriginal: boolean;
  type: 'prefix' | 'suffix';
  value: string;
}

export interface PhotoItem {
  id: string;
  file: File;
  imageUrl: string;
  captionSettings: CaptionSettings;
  watermarkSettings: WatermarkSettings;
  framingSettings: FramingSettings;
  metadata: { width: number; height: number } | null;
  exifData: any | null;
}

export enum BorderSize {
  None = 0,
  Small = 8,
  Medium = 16,
  Large = 32,
}

export enum FilterMode {
  Normal = 'normal',
  Grayscale = 'grayscale',
  Sepia = 'sepia',
}

export interface PiCollagePicture {
  id: string;
  file: File;
  previewUrl: string;
  aspectRatio: number; // width / height

  // Transform and Framing
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  zoom: number; // For the image inside its frame
  offsetX: number; // Pan center X
  offsetY: number; // Pan center Y

  // Properties
  borderSize: BorderSize;
  borderColor: TextColor;
  filter: FilterMode;

  // State
  zIndex: number;
  isVisible: boolean;
}

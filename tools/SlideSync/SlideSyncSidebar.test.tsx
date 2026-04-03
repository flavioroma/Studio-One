import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SlideSyncSidebar } from './SlideSyncSidebar';
import { LanguageProvider } from '../../contexts/LanguageContext';
import { AspectRatio, TextColor, TextPosition, TextSize, FilterMode } from '../../types';
import { translations } from '../../translations';

describe('SlideSyncSidebar', () => {
  const t = translations.en;

  const mockSlide = {
    id: '1',
    file: new File([], 'img.jpg'),
    previewUrl: 'blob:1',
    framingSettings: {
      zoom: 1,
      offsetX: 0,
      offsetY: 0,
    },
    filterSettings: FilterMode.Normal,
    borderSettings: {
      size: 0,
      color: TextColor.White,
    },
    captionSettings: {
      text: 'Slide 1',
      color: TextColor.White,
      position: TextPosition.Center,
      textSize: TextSize.Small,
      isItalic: false,
    },
    watermarkSettings: {
      file: null,
      position: TextPosition.TopRight,
      opacity: 0.2,
      scale: 0.2,
    },
  };

  const defaultProps = {
    slide: null,
    onUpdate: vi.fn(),
    onAutoCaption: vi.fn(),
    isProcessing: false,
    aspectRatio: AspectRatio.Landscape_16_9,
    onImageUpload: vi.fn(),
    audioFile: null,
    onAudioUpload: vi.fn(),
    onRemoveAudio: vi.fn(),
    audioTrimTracks: [],
    onSelectAudioTrimTrack: vi.fn(),
    onAspectRatioChange: vi.fn(),
    hasContent: false,
    onDeleteAll: vi.fn(),
    hasSlides: false,
    hasMedia: false,
  };

  const renderWithContext = (props = defaultProps) => {
    return render(
      <LanguageProvider defaultLanguage="en">
        <SlideSyncSidebar {...props} />
      </LanguageProvider>
    );
  };

  it('renders basic upload controls', () => {
    renderWithContext();
    expect(screen.getByText(new RegExp(t.tools.slidesync.backgroundMusic, 'i'))).toBeInTheDocument();
    expect(screen.getByText(new RegExp(t.tools.slidesync.uploadImages, 'i'))).toBeInTheDocument();
  });

  it('shows empty state when no slide is selected', () => {
    renderWithContext();
    expect(screen.getByText(new RegExp(t.tools.slidesync.noSlideSelected.substring(0, 15), 'i'))).toBeInTheDocument();
  });

  it('calls onAspectRatioChange when a format button is clicked', () => {
    renderWithContext({ ...defaultProps, hasMedia: true });
    const portraitBtn = screen.getByText('9:16');
    fireEvent.click(portraitBtn);
    expect(defaultProps.onAspectRatioChange).toHaveBeenCalledWith(AspectRatio.Portrait_9_16);
  });

  it('renders slide properties when a slide is selected', () => {
    renderWithContext({ ...defaultProps, slide: mockSlide, hasMedia: true });
    expect(screen.getByText(t.tools.slidesync.slideProperties)).toBeInTheDocument();
    expect(screen.getByText(t.common.framing)).toBeInTheDocument();
    expect(screen.getByText(t.tools.picollage.border)).toBeInTheDocument();
    expect(screen.getByText(t.common.filters)).toBeInTheDocument();
    expect(screen.getByText(t.common.overlay)).toBeInTheDocument();
    expect(screen.getByDisplayValue('Slide 1')).toBeInTheDocument();
  });

  it('calls onUpdate when zoom slider is moved', () => {
    renderWithContext({ ...defaultProps, slide: mockSlide, hasMedia: true });

    // Expand Framing panel
    fireEvent.click(screen.getByText(t.common.framing));

    const zoomSlider = screen.getByRole('slider', { name: new RegExp(t.tools.slidesync.magnification, 'i') });
    fireEvent.change(zoomSlider, { target: { value: '2.5' } });
    expect(defaultProps.onUpdate).toHaveBeenCalledWith({ framingSettings: { zoom: 2.5, offsetX: 0, offsetY: 0 } });
  });

  it('renders watermark settings when a slide is selected', () => {
    renderWithContext({ ...defaultProps, slide: mockSlide, hasMedia: true });
    // Watermark title is used in WatermarkSettingsPanel
    expect(screen.getAllByText(t.watermark.title).length).toBeGreaterThan(0);
  });

  it('renders filter buttons when a slide is selected', () => {
    renderWithContext({ ...defaultProps, slide: mockSlide, hasMedia: true });

    // Expand Filters panel
    fireEvent.click(screen.getByText(t.common.filters));

    expect(screen.getByText(t.common.filters)).toBeInTheDocument();
    expect(screen.getAllByText(t.common.filterNormal).length).toBeGreaterThan(0);
    expect(screen.getByText(t.common.filterGrayscale)).toBeInTheDocument();
    expect(screen.getByText(t.common.filterSepia)).toBeInTheDocument();
  });

  it('calls onUpdate with grayscale filter when Grayscale button is clicked', () => {
    renderWithContext({ ...defaultProps, slide: mockSlide, hasMedia: true });

    // Expand Filters panel
    fireEvent.click(screen.getByText(t.common.filters));

    const bwBtn = screen.getByText(t.common.filterGrayscale);
    fireEvent.click(bwBtn);
    expect(defaultProps.onUpdate).toHaveBeenCalledWith({ filterSettings: FilterMode.Grayscale });
  });

  it('calls onDeleteAll when erase button is clicked', () => {
    renderWithContext({ ...defaultProps, hasContent: true });
    const eraseBtn = screen.getByText(new RegExp(t.common.eraseProject, 'i'));
    fireEvent.click(eraseBtn);
    expect(defaultProps.onDeleteAll).toHaveBeenCalled();
  });

  describe('AudioTrim Integration', () => {
    it('does not show Import from AudioTrim button when no tracks are available', () => {
      renderWithContext({ ...defaultProps, audioTrimTracks: [] });
      expect(screen.queryByText(t.tools.slidesync.selectFromAudioTrim)).not.toBeInTheDocument();
    });

    it('shows Import from AudioTrim button when tracks are available', () => {
      const tracks = [
        {
          id: '1',
          file: new File([], 'music.mp3'),
          startTime: 0,
          endTime: 10,
          exportFormat: 'wav' as const,
        },
      ];
      renderWithContext({ ...defaultProps, audioTrimTracks: tracks });
      expect(screen.getByText(t.tools.slidesync.selectFromAudioTrim)).toBeInTheDocument();
    });

    it('calls onSelectAudioTrimTrack immediately when there is only one track', () => {
      const track = {
        id: '1',
        file: new File([], 'music.mp3'),
        startTime: 0,
        endTime: 10,
        exportFormat: 'wav' as const,
      };
      renderWithContext({ ...defaultProps, audioTrimTracks: [track] });

      const btn = screen.getByText(t.tools.slidesync.selectFromAudioTrim);
      fireEvent.click(btn);

      expect(defaultProps.onSelectAudioTrimTrack).toHaveBeenCalledWith(track);
    });

    it('shows a list of tracks when multiple tracks are available', () => {
      const tracks = [
        {
          id: '1',
          file: new File([], 'music1.mp3'),
          startTime: 0,
          endTime: 10,
          exportFormat: 'wav' as const,
        },
        {
          id: '2',
          file: new File([], 'music2.mp3'),
          startTime: 5,
          endTime: 15,
          exportFormat: 'wav' as const,
        },
      ];
      renderWithContext({ ...defaultProps, audioTrimTracks: tracks });

      const btn = screen.getByText(t.tools.slidesync.selectFromAudioTrim);
      fireEvent.click(btn);

      expect(screen.getByText('music1.mp3')).toBeInTheDocument();
      expect(screen.getByText('music2.mp3')).toBeInTheDocument();
    });

    it('calls onSelectAudioTrimTrack when a track is clicked in the multi-track list', () => {
      const tracks = [
        {
          id: '1',
          file: new File([], 'music1.mp3'),
          startTime: 0,
          endTime: 10,
          exportFormat: 'wav' as const,
        },
        {
          id: '2',
          file: new File([], 'music2.mp3'),
          startTime: 5,
          endTime: 15,
          exportFormat: 'wav' as const,
        },
      ];
      renderWithContext({ ...defaultProps, audioTrimTracks: tracks });

      fireEvent.click(screen.getByText(t.tools.slidesync.selectFromAudioTrim));
      fireEvent.click(screen.getByText('music2.mp3'));

      expect(defaultProps.onSelectAudioTrimTrack).toHaveBeenCalledWith(tracks[1]);
      expect(screen.queryByText('music1.mp3')).not.toBeInTheDocument();
    });
  });
});


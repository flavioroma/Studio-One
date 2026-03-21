import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SlideSyncSidebar } from './SlideSyncSidebar';
import { LanguageProvider } from '../../contexts/LanguageContext';
import { AspectRatio, TextColor, TextPosition, TextSize, FilterMode } from '../../types';

describe('SlideSyncSidebar', () => {
  const mockSlide = {
    id: '1',
    file: new File([], 'img.jpg'),
    previewUrl: 'blob:1',
    text: 'Slide 1',
    color: TextColor.White,
    position: TextPosition.Center,
    textSize: TextSize.Small,
    zoom: 1,
    offsetX: 0,
    offsetY: 0,
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
  };

  const renderWithContext = (props = defaultProps) => {
    return render(
      <LanguageProvider>
        <SlideSyncSidebar {...props} />
      </LanguageProvider>
    );
  };

  it('renders basic upload controls', () => {
    renderWithContext();
    expect(screen.getByText(/1\. Background music/i)).toBeInTheDocument();
    expect(screen.getByText(/2\. Images/i)).toBeInTheDocument();
    expect(screen.getByText(/Aspect Ratio/i)).toBeInTheDocument();
  });

  it('shows empty state when no slide is selected', () => {
    renderWithContext();
    expect(screen.getByText(/Select a slide/i)).toBeInTheDocument();
  });

  it('calls onAspectRatioChange when a format button is clicked', () => {
    renderWithContext();
    const portraitBtn = screen.getByText('9:16');
    fireEvent.click(portraitBtn);
    expect(defaultProps.onAspectRatioChange).toHaveBeenCalledWith(AspectRatio.Portrait_9_16);
  });

  it('renders slide properties when a slide is selected', () => {
    renderWithContext({ ...defaultProps, slide: mockSlide });
    expect(screen.getByText(/Slide Properties/i)).toBeInTheDocument();
    expect(screen.getByText(/Framing/i)).toBeInTheDocument();
    expect(screen.getByText(/Border/i)).toBeInTheDocument();
    expect(screen.getByText(/Filters/i)).toBeInTheDocument();
    // expect(screen.getByText(/Overlay/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue('Slide 1')).toBeInTheDocument();
  });

  it('calls onUpdate when zoom slider is moved', () => {
    renderWithContext({ ...defaultProps, slide: mockSlide });

    // Expand Framing panel
    fireEvent.click(screen.getByText(/Framing/i));

    const zoomSlider = screen.getByRole('slider');
    fireEvent.change(zoomSlider, { target: { value: '2.5' } });
    expect(defaultProps.onUpdate).toHaveBeenCalledWith({ zoom: 2.5 });
  });

  it('renders watermark settings when a slide is selected', () => {
    renderWithContext({ ...defaultProps, slide: mockSlide });
    expect(screen.getAllByText(/Watermark/i).length).toBeGreaterThan(0);
  });

  it('renders filter buttons when a slide is selected', () => {
    renderWithContext({ ...defaultProps, slide: mockSlide });

    // Expand Filters panel
    fireEvent.click(screen.getByText(/Filters/i));

    expect(screen.getByText(/Filters/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Normal/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Grayscale/i)).toBeInTheDocument();
    expect(screen.getByText(/Sepia/i)).toBeInTheDocument();
  });

  it('calls onUpdate with grayscale filter when Grayscale button is clicked', () => {
    renderWithContext({ ...defaultProps, slide: mockSlide });

    // Expand Filters panel
    fireEvent.click(screen.getByText(/Filters/i));

    const bwBtn = screen.getByText(/Grayscale/i);
    fireEvent.click(bwBtn);
    expect(defaultProps.onUpdate).toHaveBeenCalledWith({ filter: FilterMode.Grayscale });
  });

  it('calls onDeleteAll when erase button is clicked', () => {
    renderWithContext({ ...defaultProps, hasContent: true });
    const eraseBtn = screen.getByText(/Erase the project/i);
    fireEvent.click(eraseBtn);
    expect(defaultProps.onDeleteAll).toHaveBeenCalled();
  });

  describe('AudioTrim Integration', () => {
    it('does not show Import from AudioTrim button when no tracks are available', () => {
      renderWithContext({ ...defaultProps, audioTrimTracks: [] });
      expect(screen.queryByText(/Import from AudioTrim/i)).not.toBeInTheDocument();
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
      expect(screen.getByText(/Import from AudioTrim/i)).toBeInTheDocument();
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

      const btn = screen.getByText(/Import from AudioTrim/i);
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

      const btn = screen.getByText(/Import from AudioTrim/i);
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

      fireEvent.click(screen.getByText(/Import from AudioTrim/i));
      fireEvent.click(screen.getByText('music2.mp3'));

      expect(defaultProps.onSelectAudioTrimTrack).toHaveBeenCalledWith(tracks[1]);
      expect(screen.queryByText('music1.mp3')).not.toBeInTheDocument();
    });
  });
});

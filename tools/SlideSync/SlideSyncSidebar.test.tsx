import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SlideSyncSidebar } from './SlideSyncSidebar';
import { LanguageProvider } from '../../contexts/LanguageContext';
import { AspectRatio, TextColor, TextPosition, TextSize } from '../../types';

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
    expect(screen.getByText(/2\. Photos/i)).toBeInTheDocument();
    expect(screen.getByText(/3\. Choose video format/i)).toBeInTheDocument();
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
    expect(screen.getByText(/Framing Preview/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue('Slide 1')).toBeInTheDocument();
  });

  it('calls onUpdate when zoom slider is moved', () => {
    renderWithContext({ ...defaultProps, slide: mockSlide });
    const zoomSlider = screen.getByRole('slider');
    fireEvent.change(zoomSlider, { target: { value: '2.5' } });
    expect(defaultProps.onUpdate).toHaveBeenCalledWith({ zoom: 2.5 });
  });

  it('calls onDeleteAll when erase button is clicked', () => {
    renderWithContext({ ...defaultProps, hasContent: true });
    const eraseBtn = screen.getByText(/Erase the project/i);
    fireEvent.click(eraseBtn);
    expect(defaultProps.onDeleteAll).toHaveBeenCalled();
  });
});

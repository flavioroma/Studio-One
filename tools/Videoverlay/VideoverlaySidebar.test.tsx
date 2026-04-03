import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { VideoverlaySidebar } from './VideoverlaySidebar';
import { LanguageProvider } from '../../contexts/LanguageContext';
import { Rotation, AudioMode, TextColor, TextPosition, TextSize } from '../../types';
import { translations } from '../../translations';

describe('VideoverlaySidebar', () => {
  const t = translations.en;

  const defaultProps = {
    file: null,
    metadata: null,
    rotation: Rotation.None,
    audioMode: AudioMode.Keep,
    audioFile: null,
    captionSettings: {
      text: '',
      color: TextColor.White,
      position: TextPosition.BottomLeft,
      textSize: TextSize.Small,
      isItalic: false,
    },
    watermarkSettings: {
      file: null,
      position: TextPosition.TopRight,
      opacity: 0.2,
      scale: 0.2,
    },
    onFileChange: vi.fn(),
    onRotationChange: vi.fn(),
    onAudioModeChange: vi.fn(),
    onAudioFileChange: vi.fn(),
    onRemoveAudioFile: vi.fn(),
    onCaptionUpdate: vi.fn(),
    onWatermarkUpdate: vi.fn(),
    preserveVideoMetadata: true,
    onPreserveVideoMetadataChange: vi.fn(),
    hasVideoMetadata: false,
    onDelete: vi.fn(),
  };

  const renderWithContext = (props = defaultProps) => {
    return render(
      <LanguageProvider>
        <VideoverlaySidebar {...props} />
      </LanguageProvider>
    );
  };

  it('renders upload section when no file is selected', () => {
    renderWithContext();
    expect(screen.getByText(new RegExp(t.tools.videoverlay.uploadVideo, 'i'))).toBeInTheDocument();
  });

  it('renders editing controls when file is present', () => {
    const file = new File([''], 'video.mp4', { type: 'video/mp4' });
    renderWithContext({ ...defaultProps, file });

    expect(screen.getByText(t.tools.videoverlay.rotation)).toBeInTheDocument();
    expect(screen.getAllByText(t.tools.videoverlay.audioSettings).length).toBeGreaterThan(0);
    expect(screen.getByText(t.common.overlay)).toBeInTheDocument();
    expect(screen.getByText(new RegExp(t.common.eraseProject, 'i'))).toBeInTheDocument();
  });

  it('calls onRotationChange when rotation button is clicked', () => {
    const file = new File([''], 'video.mp4', { type: 'video/mp4' });
    renderWithContext({ ...defaultProps, file });

    const rot90Btn = screen.getByText('90° CW');
    fireEvent.click(rot90Btn);
    expect(defaultProps.onRotationChange).toHaveBeenCalledWith(Rotation.CW_90);
  });

  it('calls onAudioModeChange when audio option is clicked', () => {
    const file = new File([''], 'video.mp4', { type: 'video/mp4' });
    renderWithContext({ ...defaultProps, file });

    const removeAudioBtn = screen.getByText(new RegExp(t.tools.videoverlay.removeAudio, 'i'));
    fireEvent.click(removeAudioBtn);
    expect(defaultProps.onAudioModeChange).toHaveBeenCalledWith(AudioMode.Remove);
  });

  it('shows audio upload when audio mode is Replace', () => {
    const file = new File([''], 'video.mp4', { type: 'video/mp4' });
    renderWithContext({ ...defaultProps, file, audioMode: AudioMode.Replace });

    expect(screen.getByText(t.tools.videoverlay.selectAudio)).toBeInTheDocument();
  });

  it('calls onDelete when erase button is clicked', () => {
    const file = new File([''], 'video.mp4', { type: 'video/mp4' });
    renderWithContext({ ...defaultProps, file });

    const eraseBtn = screen.getByText(new RegExp(t.common.eraseProject, 'i'));
    fireEvent.click(eraseBtn);
    expect(defaultProps.onDelete).toHaveBeenCalled();
  });

  it('does not show Metadata section when hasVideoMetadata is false', () => {
    const file = new File([''], 'video.mp4', { type: 'video/mp4' });
    renderWithContext({ ...defaultProps, file, hasVideoMetadata: false });

    expect(screen.queryByText(new RegExp('^' + t.common.metadata + '$', 'i'))).not.toBeInTheDocument();
    expect(screen.queryByText(new RegExp(t.tools.videoverlay.preserveMetadata, 'i'))).not.toBeInTheDocument();
  });

  it('shows Metadata section and checkbox when hasVideoMetadata is true', () => {
    const file = new File([''], 'video.mp4', { type: 'video/mp4' });
    const onPreserveVideoMetadataChange = vi.fn();
    renderWithContext({
      ...defaultProps,
      file,
      hasVideoMetadata: true,
      preserveVideoMetadata: true,
      onPreserveVideoMetadataChange,
    });

    expect(screen.getByText(new RegExp('^' + t.common.metadata + '$', 'i'))).toBeInTheDocument();
    expect(screen.getByText(new RegExp(t.tools.videoverlay.preserveMetadata, 'i'))).toBeInTheDocument();

    // Click the hidden checkbox directly
    const checkbox = screen.getByRole('checkbox', { hidden: true });
    fireEvent.click(checkbox);
    expect(onPreserveVideoMetadataChange).toHaveBeenCalledWith(false);
  });
});


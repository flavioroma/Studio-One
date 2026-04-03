import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AudioTrimSidebar } from './AudioTrimSidebar';
import { LanguageProvider } from '../../contexts/LanguageContext';
import { AudioTrackItem } from '../../services/PersistenceService';
import { translations } from '../../translations';

describe('AudioTrimSidebar', () => {
  const t = translations.en;

  const mockTrack: AudioTrackItem = {
    id: 'track1',
    file: new File([''], 'song.mp3', { type: 'audio/mp3' }),
    startTime: 0,
    endTime: 120,
    exportFormat: 'wav',
  };

  const defaultProps = {
    tracks: [] as AudioTrackItem[],
    selectedId: null,
    onFilesSelected: vi.fn(),
    onSelectTrack: vi.fn(),
    onDeleteAll: vi.fn(),
  };

  const renderWithContext = (props = defaultProps) => {
    return render(
      <LanguageProvider>
        <AudioTrimSidebar {...props} />
      </LanguageProvider>
    );
  };

  it('renders drop zone when no tracks are present', () => {
    renderWithContext();
    expect(screen.getByText(new RegExp(t.tools.audiotrim.dropZoneTitleMulti, 'i'))).toBeInTheDocument();
  });

  it('does not render erase button when no tracks', () => {
    renderWithContext();
    expect(screen.queryByText(new RegExp(t.common.eraseProject, 'i'))).not.toBeInTheDocument();
  });

  it('renders track list when tracks are present', () => {
    renderWithContext({ ...defaultProps, tracks: [mockTrack], selectedId: 'track1' });
    expect(screen.getByText('song.mp3')).toBeInTheDocument();
  });

  it('renders erase button when tracks are present', () => {
    renderWithContext({ ...defaultProps, tracks: [mockTrack], selectedId: 'track1' });
    expect(screen.getByText(new RegExp(t.common.eraseProject, 'i'))).toBeInTheDocument();
  });

  it('calls onSelectTrack when a track is clicked', () => {
    renderWithContext({ ...defaultProps, tracks: [mockTrack], selectedId: null });
    fireEvent.click(screen.getByText('song.mp3'));
    expect(defaultProps.onSelectTrack).toHaveBeenCalledWith('track1');
  });

  it('calls onDeleteAll when erase button is clicked', () => {
    renderWithContext({ ...defaultProps, tracks: [mockTrack], selectedId: 'track1' });
    const eraseBtn = screen.getByText(new RegExp(t.common.eraseProject, 'i'));
    fireEvent.click(eraseBtn);
    expect(defaultProps.onDeleteAll).toHaveBeenCalled();
  });

  it('highlights selected track', () => {
    const track2: AudioTrackItem = {
      id: 'track2',
      file: new File([''], 'song2.mp3', { type: 'audio/mp3' }),
      startTime: 0,
      endTime: 60,
      exportFormat: 'mp3',
    };

    renderWithContext({
      ...defaultProps,
      tracks: [mockTrack, track2],
      selectedId: 'track1',
    });

    const selectedBtn = screen.getByText('song.mp3').closest('button');
    expect(selectedBtn?.className).toContain('bg-tool-audiotrim/20');

    const unselectedBtn = screen.getByText('song2.mp3').closest('button');
    expect(unselectedBtn?.className).not.toContain('bg-tool-audiotrim/20');
  });

  it('still shows drop zone (compact) when tracks exist', () => {
    renderWithContext({ ...defaultProps, tracks: [mockTrack], selectedId: 'track1' });
    // The drop zone with file input should still be present for adding more
    expect(screen.getByTestId('file-input')).toBeInTheDocument();
  });
});


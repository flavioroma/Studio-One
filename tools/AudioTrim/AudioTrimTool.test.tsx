import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AudioTrimTool } from './AudioTrimTool';
import { LanguageProvider } from '../../contexts/LanguageContext';
import { translations } from '../../translations';

// Mock services
vi.mock('../../services/PersistenceService', () => ({
  PersistenceService: {
    loadAudioTrimState: vi.fn().mockResolvedValue(null),
    saveAudioTrimState: vi.fn(),
  },
}));

// Mock lamejs
vi.mock('@breezystack/lamejs', () => ({
  Mp3Encoder: vi.fn(),
}));

// Mock URL.createObjectURL
global.URL.createObjectURL = vi.fn(() => 'mock-url');
global.URL.revokeObjectURL = vi.fn();

describe('AudioTrimTool', () => {
  const t = translations.en;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderWithContext = () => {
    return render(
      <LanguageProvider>
        <AudioTrimTool />
      </LanguageProvider>
    );
  };

  it('renders the initial state with drop zone in sidebar', () => {
    renderWithContext();
    expect(screen.getByText(new RegExp(t.tools.audiotrim.dropZoneTitleMulti, 'i'))).toBeInTheDocument();
  });

  it('shows awaiting source hint when no tracks', () => {
    renderWithContext();
    expect(screen.getByText(new RegExp(t.tools.audiotrim.noTracksHint, 'i'))).toBeInTheDocument();
  });

  it('does not show erase button when no tracks', () => {
    renderWithContext();
    expect(screen.queryByText(new RegExp(t.common.eraseProject, 'i'))).not.toBeInTheDocument();
  });

  it('renders file input for uploading', () => {
    renderWithContext();
    expect(screen.getByTestId('file-input')).toBeInTheDocument();
  });
});


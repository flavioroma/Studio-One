import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VideoverlayTool } from './VideoverlayTool';
import { LanguageProvider } from '../../contexts/LanguageContext';
import { translations } from '../../translations';

// Mock services
vi.mock('../../services/PersistenceService', () => ({
  PersistenceService: {
    loadVideoverlayState: vi.fn().mockResolvedValue(null),
    saveVideoverlayState: vi.fn(),
  },
}));

// Mock URL.createObjectURL
global.URL.createObjectURL = vi.fn();
global.URL.revokeObjectURL = vi.fn();

describe('VideoverlayTool', () => {
  const t = translations.en;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderWithContext = () => {
    return render(
      <LanguageProvider>
        <VideoverlayTool />
      </LanguageProvider>
    );
  };

  it('renders the initial state with upload button', () => {
    renderWithContext();
    expect(screen.getByText(new RegExp(t.tools.videoverlay.uploadVideo, 'i'))).toBeInTheDocument();
  });

  it('shows the main tool interface after uploading a file', async () => {
    renderWithContext();
    const file = new File([''], 'test.mp4', { type: 'video/mp4' });
    const input = screen.getByTestId('file-input') as HTMLInputElement;

    // Mock video metadata loading
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tagName) => {
      if (tagName === 'video') {
        return {
          preload: '',
          onloadedmetadata: null,
          set src(url: string) {
            if (this.onloadedmetadata) {
              setTimeout(() => (this as any).onloadedmetadata!(), 0);
            }
          },
          videoWidth: 1920,
          videoHeight: 1080,
          duration: 60,
          play: vi.fn(),
          pause: vi.fn(),
          setAttribute: vi.fn(),
          style: {},
        } as any;
      }
      return originalCreateElement(tagName);
    });

    fireEvent.change(input, { target: { files: [file] } });

    // Wait for the tool to process the file
    const sidebarTitle = await screen.findByText(t.tools.videoverlay.rotation);
    expect(sidebarTitle).toBeInTheDocument();
    expect(screen.getAllByText(t.tools.videoverlay.audioSettings).length).toBeGreaterThan(0);
  });
});


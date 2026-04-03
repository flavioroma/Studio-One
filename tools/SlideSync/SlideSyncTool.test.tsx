import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SlideSyncTool } from './SlideSyncTool';
import { LanguageProvider } from '../../contexts/LanguageContext';
import { PersistenceService } from '../../services/PersistenceService';
import { translations } from '../../translations';

// Mock services
vi.mock('../../services/PersistenceService', () => ({
  PersistenceService: {
    loadSlideSyncState: vi.fn().mockResolvedValue(null),
    loadAudioTrimState: vi.fn().mockResolvedValue({ tracks: [], selectedId: null }),
    saveSlideSyncState: vi.fn(),
    loadPhotoverlayState: vi.fn().mockResolvedValue(null),
  },
}));

global.URL.createObjectURL = vi.fn(() => 'mock-url');
global.URL.revokeObjectURL = vi.fn();

// Mock Canvas
HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
  drawImage: vi.fn(),
  fillText: vi.fn(),
  measureText: vi.fn().mockReturnValue({ width: 100 }),
  fillRect: vi.fn(),
} as any);

HTMLCanvasElement.prototype.toBlob = vi.fn((callback) => {
  callback(new Blob([''], { type: 'image/jpeg' }));
});

// Mock Icons
vi.mock('lucide-react', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    PlayCircle: () => <div data-testid="play-circle-icon" />,
  };
});

describe('SlideSyncTool', () => {
  const t = translations.en;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderWithContext = () => {
    return render(
      <LanguageProvider defaultLanguage="en">
        <SlideSyncTool />
      </LanguageProvider>
    );
  };

  it('renders the initial empty state', () => {
    renderWithContext();
    expect(screen.getByText(new RegExp(t.tools.slidesync.awaitingMedia, 'i'))).toBeInTheDocument();
  });

  it('shows the editor after uploading images', async () => {
    renderWithContext();
    const file = new File([''], 'test.jpg', { type: 'image/jpeg' });
    const input = screen.getByLabelText(new RegExp(t.tools.slidesync.addImages, 'i')) as HTMLInputElement;

    fireEvent.change(input, { target: { files: [file] } });

    // Timeline should show the slide
    expect(await screen.findByAltText('Slide 1')).toBeInTheDocument();
  });

  it('deletes non-customized slide immediately', async () => {
    renderWithContext();
    const file = new File([''], 'test.jpg', { type: 'image/jpeg' });
    const input = screen.getByLabelText(new RegExp(t.tools.slidesync.addImages, 'i')) as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });

    const deleteBtn = await screen.findByTitle(t.common.removeFile);
    fireEvent.click(deleteBtn);

    expect(screen.queryByAltText('Slide 1')).not.toBeInTheDocument();
  });

  it('shows confirmation modal when deleting customized slide', async () => {
    renderWithContext();
    
    // 1. Add audio first (required by Sidebar to show slide settings)
    const audioFile = new File([''], 'test.mp3', { type: 'audio/mpeg' });
    const audioInput = screen.getByLabelText(new RegExp(t.tools.slidesync.selectAudio, 'i')) as HTMLInputElement;
    fireEvent.change(audioInput, { target: { files: [audioFile] } });

    // 2. Add an image
    const file = new File([''], 'test.jpg', { type: 'image/jpeg' });
    const input = screen.getByLabelText(new RegExp(t.tools.slidesync.addImages, 'i')) as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });

    const slideThumb = await screen.findByAltText('Slide 1');
    fireEvent.click(slideThumb);

    // 3. Edit properties
    const overlayPanel = await screen.findByText((content, element) => {
      return content.toLowerCase().includes(t.common.overlay.toLowerCase());
    });
    fireEvent.click(overlayPanel);

    const textarea = await screen.findByPlaceholderText(t.captions.enterOverlayText);
    fireEvent.change(textarea, { target: { value: 'Test Slide Text' } });

    const deleteBtn = screen.getByTitle(t.common.removeFile);
    fireEvent.click(deleteBtn);

    // 4. Check Modal
    expect(await screen.findByText(t.tools.slidesync.removeSlideTitle)).toBeInTheDocument();
  });

  it('removes customized slide after confirmation', async () => {
    renderWithContext();
    
    // Add audio
    const audioFile = new File([''], 'test.mp3', { type: 'audio/mpeg' });
    const audioInput = screen.getByLabelText(new RegExp(t.tools.slidesync.selectAudio, 'i')) as HTMLInputElement;
    fireEvent.change(audioInput, { target: { files: [audioFile] } });

    // Add image
    const file = new File([''], 'test.jpg', { type: 'image/jpeg' });
    const input = screen.getByLabelText(new RegExp(t.tools.slidesync.addImages, 'i')) as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });

    const slideThumb = await screen.findByAltText('Slide 1');
    fireEvent.click(slideThumb);

    const overlayPanel = await screen.findByText((content, element) => {
      return content.toLowerCase().includes(t.common.overlay.toLowerCase());
    });
    fireEvent.click(overlayPanel);

    const textarea = await screen.findByPlaceholderText(t.captions.enterOverlayText);
    fireEvent.change(textarea, { target: { value: 'Test' } });
    
    fireEvent.click(screen.getByTitle(t.common.removeFile));

    const confirmBtn = await screen.findByRole('button', { name: new RegExp(t.common.yesRemove, 'i') });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(screen.queryByAltText('Slide 1')).not.toBeInTheDocument();
    });
  });

  it('keeps customized slide after cancellation', async () => {
    renderWithContext();
    
    // Add audio
    const audioFile = new File([''], 'test.mp3', { type: 'audio/mpeg' });
    const audioInput = screen.getByLabelText(new RegExp(t.tools.slidesync.selectAudio, 'i')) as HTMLInputElement;
    fireEvent.change(audioInput, { target: { files: [audioFile] } });

    // Add image
    const file = new File([''], 'test.jpg', { type: 'image/jpeg' });
    const input = screen.getByLabelText(new RegExp(t.tools.slidesync.addImages, 'i')) as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });

    const slideThumb = await screen.findByAltText('Slide 1');
    fireEvent.click(slideThumb);

    const overlayPanel = await screen.findByText((content, element) => {
      return content.toLowerCase().includes(t.common.overlay.toLowerCase());
    });
    fireEvent.click(overlayPanel);

    const textarea = await screen.findByPlaceholderText(t.captions.enterOverlayText);
    fireEvent.change(textarea, { target: { value: 'Test' } });

    fireEvent.click(screen.getByTitle(t.common.removeFile));

    const cancelBtn = await screen.findByRole('button', { name: new RegExp(t.common.cancel, 'i') });
    fireEvent.click(cancelBtn);

    await waitFor(() => {
      expect(screen.getByAltText('Slide 1')).toBeInTheDocument();
      expect(screen.queryByText(t.tools.slidesync.removeSlideTitle)).not.toBeInTheDocument();
    });
  });





  it('shows confirmation modal when slide has magnification applied', async () => {
    renderWithContext();
    
    // 1. Add audio first (required by Sidebar to show slide settings)
    const audioFile = new File([''], 'test.mp3', { type: 'audio/mpeg' });
    const audioInput = screen.getByLabelText(new RegExp(t.tools.slidesync.selectAudio, 'i')) as HTMLInputElement;
    fireEvent.change(audioInput, { target: { files: [audioFile] } });

    // 2. Add an image
    const file = new File([''], 'test.jpg', { type: 'image/jpeg' });
    const input = screen.getByLabelText(new RegExp(t.tools.slidesync.addImages, 'i')) as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });

    const slideThumb = await screen.findByAltText('Slide 1');
    fireEvent.click(slideThumb);

    // 3. Expand Framing panel
    const framingPanel = await screen.findByText((content, element) => {
      return content.toLowerCase().includes(t.common.framing.toLowerCase());
    });
    fireEvent.click(framingPanel);

    // 4. Change zoom - Using specific ARIA label
    const zoomSlider = await screen.findByLabelText(new RegExp(t.tools.slidesync.magnification, 'i'));
    fireEvent.change(zoomSlider, { target: { value: '1.5' } });

    const deleteBtn = screen.getByTitle(t.common.removeFile);
    fireEvent.click(deleteBtn);

    // 5. Check Modal
    expect(await screen.findByText(t.tools.slidesync.removeSlideTitle)).toBeInTheDocument();
  });

  it('hides "Import from Photoverlay" button when slides are present', async () => {
    // Mock Photoverlay data to be available
    PersistenceService.loadPhotoverlayState = vi.fn().mockResolvedValue({
      items: [{ id: '1', file: new File([''], 'test.jpg') }],
    });

    renderWithContext();

    // Button should be visible initially
    const importBtn = await screen.findByText(new RegExp(t.common.importFromPhotoverlay, 'i'));
    expect(importBtn).toBeInTheDocument();

    // Upload an image to SlideSync
    const file = new File([''], 'test.jpg', { type: 'image/jpeg' });
    const input = screen.getByLabelText(new RegExp(t.tools.slidesync.addImages, 'i')) as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });

    // Timeline should show the slide
    await screen.findByAltText('Slide 1');

    // Button should be hidden now
    await waitFor(() => {
      expect(screen.queryByText(new RegExp(t.common.importFromPhotoverlay, 'i'))).not.toBeInTheDocument();
    });
  });
});


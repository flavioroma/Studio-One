import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SlideSyncTool } from './SlideSyncTool';
import { LanguageProvider } from '../../contexts/LanguageContext';
import { PersistenceService } from '../../services/PersistenceService';

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
vi.mock('lucide-react', async () => {
  const actual = await vi.importActual('lucide-react');
  return {
    ...actual,
    PlayCircle: () => <div data-testid="play-circle-icon" />,
  };
});

describe('SlideSyncTool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderWithContext = () => {
    return render(
      <LanguageProvider>
        <SlideSyncTool />
      </LanguageProvider>
    );
  };

  it('renders the initial empty state', () => {
    renderWithContext();
    expect(screen.getByText(/No slides yet. Add images to start/i)).toBeInTheDocument();
  });

  it('shows the editor after uploading images', async () => {
    renderWithContext();
    const file = new File([''], 'test.jpg', { type: 'image/jpeg' });
    const input = screen.getByLabelText(/Add Images/i) as HTMLInputElement;

    fireEvent.change(input, { target: { files: [file] } });

    // Timeline should show the slide
    expect(await screen.findByAltText('Slide 1')).toBeInTheDocument();
  });

  it('deletes non-customized slide immediately', async () => {
    renderWithContext();
    const file = new File([''], 'test.jpg', { type: 'image/jpeg' });
    const input = screen.getByLabelText(/Add Images/i) as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });

    const deleteBtn = await screen.findByTitle(/Remove file/i);
    fireEvent.click(deleteBtn);

    expect(screen.queryByAltText('Slide 1')).not.toBeInTheDocument();
  });

  it('shows confirmation modal when deleting customized slide', async () => {
    renderWithContext();
    const file = new File([''], 'test.jpg', { type: 'image/jpeg' });
    const input = screen.getByLabelText(/Add Images/i) as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });

    await screen.findByAltText('Slide 1');

    // Expand Overlay panel
    fireEvent.click(screen.getByText(/Overlay/i));

    // Add text
    const textarea = screen.getByPlaceholderText(/Enter overlay text/i);
    fireEvent.change(textarea, { target: { value: 'Test Slide Text' } });

    const deleteBtn = screen.getByTitle(/Remove file/i);
    fireEvent.click(deleteBtn);

    // Modal should appear
    expect(screen.getByText(/Remove Slide\?/i)).toBeInTheDocument();
    expect(screen.getByText(/Are you sure you want to remove this slide\?/i)).toBeInTheDocument();
  });

  it('removes customized slide after confirmation', async () => {
    renderWithContext();
    const file = new File([''], 'test.jpg', { type: 'image/jpeg' });
    const input = screen.getByLabelText(/Add Images/i) as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });

    await screen.findByAltText('Slide 1');
    fireEvent.click(screen.getByText(/Overlay/i));
    fireEvent.change(screen.getByPlaceholderText(/Enter overlay text/i), {
      target: { value: 'Test' },
    });
    fireEvent.click(screen.getByTitle(/Remove file/i));

    const confirmBtn = screen.getByText(/Yes, Remove/i);
    fireEvent.click(confirmBtn);

    expect(screen.queryByAltText('Slide 1')).not.toBeInTheDocument();
  });

  it('keeps customized slide after cancellation', async () => {
    renderWithContext();
    const file = new File([''], 'test.jpg', { type: 'image/jpeg' });
    const input = screen.getByLabelText(/Add Images/i) as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });

    await screen.findByAltText('Slide 1');
    fireEvent.click(screen.getByText(/Overlay/i));
    fireEvent.change(screen.getByPlaceholderText(/Enter overlay text/i), {
      target: { value: 'Test' },
    });
    fireEvent.click(screen.getByTitle(/Remove file/i));

    const cancelBtn = screen.getAllByText(/Cancel/i)[0];
    fireEvent.click(cancelBtn);

    expect(screen.getByAltText('Slide 1')).toBeInTheDocument();
    expect(screen.queryByText(/Remove Slide\?/i)).not.toBeInTheDocument();
  });

  it('shows confirmation modal when slide has magnification applied', async () => {
    renderWithContext();
    const file = new File([''], 'test.jpg', { type: 'image/jpeg' });
    const input = screen.getByLabelText(/Add Images/i) as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });

    await screen.findByAltText('Slide 1');

    // Expand Framing panel
    fireEvent.click(screen.getByText(/Framing/i));

    // Change zoom
    const zoomSlider = await screen.findByRole('slider', { name: /magnification/i });
    fireEvent.change(zoomSlider, { target: { value: '1.2' } });

    fireEvent.click(screen.getByTitle(/Remove file/i));

    expect(screen.getByText(/Remove Slide\?/i)).toBeInTheDocument();
  });

  it('hides "Import from Photoverlay" button when slides are present', async () => {
    vi.mocked(PersistenceService.loadPhotoverlayState).mockResolvedValue({
      items: [{ file: new File([''], 'test.jpg'), id: '1' }],
    } as any);

    renderWithContext();

    // Button should be visible initially
    expect(await screen.findByText(/Import from Photoverlay/i)).toBeInTheDocument();

    // Upload an image
    const file = new File([''], 'test.jpg', { type: 'image/jpeg' });
    const input = screen.getByLabelText(/Add Images/i) as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });

    // Timeline should show the slide
    await screen.findByAltText('Slide 1');

    // Button should be hidden now
    expect(screen.queryByText(/Import from Photoverlay/i)).not.toBeInTheDocument();
  });
});

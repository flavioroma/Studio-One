import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PhotoverlayTool } from './PhotoverlayTool';
import { LanguageProvider } from '../../contexts/LanguageContext';

// Mock services
vi.mock('../../services/PersistenceService', () => ({
  PersistenceService: {
    loadPhotoverlayState: vi.fn().mockResolvedValue(null),
    savePhotoverlayState: vi.fn(),
  },
}));

const { mockTransferPhotoMetadata } = vi.hoisted(() => ({
  mockTransferPhotoMetadata: vi.fn((file, blob) => Promise.resolve(blob)),
}));

vi.mock('../../services/MetadataService', () => ({
  MetadataService: {
    getPhotoMetadata: vi.fn().mockResolvedValue({ creationTime: new Date() }),
    transferPhotoMetadata: mockTransferPhotoMetadata,
  },
}));

// Mock URL.createObjectURL
global.URL.createObjectURL = vi.fn(() => 'mock-url');
global.URL.revokeObjectURL = vi.fn();

// Mock Canvas
HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
  drawImage: vi.fn(),
  fillText: vi.fn(),
  measureText: vi.fn().mockReturnValue({ width: 100 }),
} as any);

HTMLCanvasElement.prototype.toBlob = vi.fn((callback) => {
  callback(new Blob([''], { type: 'image/jpeg' }));
});

describe('PhotoverlayTool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const uploadFile = async () => {
    const file = new File([''], 'test.jpg', { type: 'image/jpeg' });
    const input = screen.getByTestId('file-input') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });
    await waitFor(() => {
      expect(screen.getAllByText(/Erase the project/i).length).toBeGreaterThan(0);
    });
    return file;
  };

  const renderWithContext = () => {
    return render(
      <LanguageProvider>
        <PhotoverlayTool />
      </LanguageProvider>
    );
  };

  it('renders the initial state with upload button', () => {
    renderWithContext();
    expect(screen.getByText(/Select or drop photos/i)).toBeInTheDocument();
  });

  it('shows the main tool interface after uploading files', async () => {
    renderWithContext();
    const file = new File([''], 'test.jpg', { type: 'image/jpeg' });
    const input = screen.getByTestId('file-input') as HTMLInputElement;

    fireEvent.change(input, { target: { files: [file] } });

    // Wait for it to switch to editing mode
    await waitFor(() => {
      expect(screen.getAllByText(/Erase the project/i).length).toBeGreaterThan(0);
    });

    // Check for resolution info which appears after upload
    expect(await screen.findByText(/Resolution/i)).toBeInTheDocument();
  });

  it('preserves metadata when the checkbox is checked', async () => {
    renderWithContext();
    await uploadFile();

    // The checkbox is checked by default
    const checkbox = screen.getByLabelText(/Preserve image metadata/i) as HTMLInputElement;
    expect(checkbox.checked).toBe(true);

    const exportBtn = screen.getByText(/EXPORT PHOTO/i);
    fireEvent.click(exportBtn);

    await waitFor(() => {
      expect(mockTransferPhotoMetadata).toHaveBeenCalled();
    });
  });

  it('erases metadata when the checkbox is unchecked', async () => {
    renderWithContext();
    await uploadFile();

    const checkbox = screen.getByLabelText(/Preserve image metadata/i) as HTMLInputElement;
    fireEvent.click(checkbox);
    expect(checkbox.checked).toBe(false);

    const exportBtn = screen.getByText(/EXPORT PHOTO/i);
    fireEvent.click(exportBtn);

    await waitFor(() => {
      // In handleExport, we only call transferPhotoMetadata if preserveMetadata is true
      expect(mockTransferPhotoMetadata).not.toHaveBeenCalled();
    });
  });

  it('deletes non-customized photo immediately', async () => {
    renderWithContext();
    await uploadFile();

    const deleteBtn = screen.getByTitle(/Remove file/i);
    fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(screen.queryByTitle(/Remove file/i)).not.toBeInTheDocument();
    });
  });

  it('shows confirmation modal when deleting customized photo', async () => {
    renderWithContext();
    await uploadFile();

    // Add caption
    const textarea = screen.getByPlaceholderText(/Enter overlay text/i);
    fireEvent.change(textarea, { target: { value: 'Test Caption' } });

    const deleteBtn = screen.getByTitle(/Remove file/i);
    fireEvent.click(deleteBtn);

    // Modal should appear
    expect(screen.getByText(/Remove Photo\?/i)).toBeInTheDocument();
    expect(screen.getByText(/Are you sure you want to remove this photo\?/i)).toBeInTheDocument();
  });

  it('removes customized photo after confirmation', async () => {
    renderWithContext();
    await uploadFile();

    fireEvent.change(screen.getByPlaceholderText(/Enter overlay text/i), {
      target: { value: 'Test' },
    });
    fireEvent.click(screen.getByTitle(/Remove file/i));

    const confirmBtn = screen.getByText(/Yes, Remove/i);
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(screen.queryByTitle(/Remove file/i)).not.toBeInTheDocument();
    });
  });

  it('keeps customized photo after cancellation', async () => {
    renderWithContext();
    await uploadFile();

    fireEvent.change(screen.getByPlaceholderText(/Enter overlay text/i), {
      target: { value: 'Test' },
    });
    fireEvent.click(screen.getByTitle(/Remove file/i));

    const cancelBtn = screen.getAllByText(/Cancel/i)[0]; // Could be multiple cancel buttons, but usually first one in modal or sidebar
    fireEvent.click(cancelBtn);

    await waitFor(() => {
      expect(screen.getByTitle(/Remove file/i)).toBeInTheDocument();
      expect(screen.queryByText(/Remove Photo\?/i)).not.toBeInTheDocument();
    });
  });
});

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

vi.mock('../../services/MetadataService', () => ({
  MetadataService: {
    getPhotoMetadata: vi.fn(),
  },
}));

// Mock URL.createObjectURL
global.URL.createObjectURL = vi.fn(() => 'mock-url');
global.URL.revokeObjectURL = vi.fn();

describe('PhotoverlayTool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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
});

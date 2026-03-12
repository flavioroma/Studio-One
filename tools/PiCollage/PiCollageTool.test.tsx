import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { PiCollageTool } from './PiCollageTool';
import { LanguageProvider } from '../../contexts/LanguageContext';

// Mock the PersistenceService to prevent IndexedDB errors in tests
vi.mock('../../services/PersistenceService', () => ({
  PersistenceService: {
    loadPiCollageState: vi.fn().mockResolvedValue(null),
    savePiCollageState: vi.fn(),
  },
}));

const renderWithLanguage = (component: React.ReactNode) => {
  return render(<LanguageProvider>{component}</LanguageProvider>);
};

describe('PiCollageTool', () => {
  it('renders the empty state drop zone initially', async () => {
    renderWithLanguage(<PiCollageTool />);

    // Check if the "Add Images" text or icon is present
    expect(screen.queryByText('1. Background music')).toBeNull(); // Should not have SlideSync texts

    // We expect the default state to prompt for images
    expect(screen.getByText('Add Images')).toBeInTheDocument();
  });
});

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SlideSyncTool } from './SlideSyncTool';
import { LanguageProvider } from '../../contexts/LanguageContext';

// Mock services
vi.mock('../../services/PersistenceService', () => ({
    PersistenceService: {
        loadState: vi.fn().mockResolvedValue(null),
        saveState: vi.fn(),
    }
}));

// Mock URL.createObjectURL
global.URL.createObjectURL = vi.fn(() => 'mock-url');
global.URL.revokeObjectURL = vi.fn();

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
        expect(screen.getByText(/No slides added|Nessuna slide/i)).toBeInTheDocument();
    });

    it('shows the editor after uploading images', async () => {
        renderWithContext();
        const file = new File([''], 'test.jpg', { type: 'image/jpeg' });
        const input = screen.getByLabelText(/Add Photos/i) as HTMLInputElement;

        fireEvent.change(input, { target: { files: [file] } });

        // Timeline should show the slide
        expect(await screen.findByAltText('Slide 1')).toBeInTheDocument();
    });
});

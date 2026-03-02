import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Timeline } from './Timeline';
import { LanguageProvider } from '../../contexts/LanguageContext';
import { TextColor, TextPosition, TextSize } from '../../types';

describe('Timeline', () => {
    const mockSlides = [
        {
            id: '1',
            file: new File([], 'img1.jpg'),
            previewUrl: 'blob:1',
            text: 'Slide 1',
            color: TextColor.White,
            position: TextPosition.Center,
            textSize: TextSize.Small,
            zoom: 1,
            offsetX: 0,
            offsetY: 0
        },
        {
            id: '2',
            file: new File([], 'img2.jpg'),
            previewUrl: 'blob:2',
            text: '',
            color: TextColor.White,
            position: TextPosition.Center,
            textSize: TextSize.Small,
            zoom: 1,
            offsetX: 0,
            offsetY: 0
        }
    ];

    const defaultProps = {
        slides: mockSlides,
        activeSlideId: '1',
        onSelectSlide: vi.fn(),
        onReorder: vi.fn(),
        onDelete: vi.fn(),
        onImageUpload: vi.fn(),
    };

    const renderWithContext = (props = defaultProps) => {
        return render(
            <LanguageProvider>
                <Timeline {...props} />
            </LanguageProvider>
        );
    };

    it('renders all slides', () => {
        renderWithContext();
        expect(screen.getByAltText('Slide 1')).toBeInTheDocument();
        expect(screen.getByAltText('Slide 2')).toBeInTheDocument();
        expect(screen.getByText('#1')).toBeInTheDocument();
        expect(screen.getByText('#2')).toBeInTheDocument();
    });

    it('shows "no slides" message when empty', () => {
        renderWithContext({ ...defaultProps, slides: [] });
        expect(screen.getByText(/No slides added yet/i)).toBeInTheDocument();
    });

    it('calls onSelectSlide when a slide is clicked', () => {
        renderWithContext();
        fireEvent.click(screen.getByAltText('Slide 2'));
        expect(defaultProps.onSelectSlide).toHaveBeenCalledWith('2');
    });

    it('calls onDelete when delete button is clicked', () => {
        renderWithContext();
        // Since delete button is hidden by default (opacity-0), we might need to find all matching buttons
        const deleteButtons = screen.getAllByTitle(/Remove file/i);
        fireEvent.click(deleteButtons[1]); // Delete second slide
        expect(defaultProps.onDelete).toHaveBeenCalledWith('2');
    });

    it('indicates which slide is active', () => {
        renderWithContext();
        const activeContainer = document.getElementById('timeline-slide-1');
        const inactiveContainer = document.getElementById('timeline-slide-2');

        expect(activeContainer?.className).toContain('border-tool-slidesync');
        expect(inactiveContainer?.className).toContain('border-slate-600');
    });

    it('shows indicator for slides with text', () => {
        renderWithContext();
        // Slide 1 has text, Slide 2 doesn't
        // The indicator has a title "Has text" from translations
        const indicator = screen.getByTitle(/Has text/i);
        expect(indicator).toBeInTheDocument();

        // Check if there's only one such indicator (since only slide 1 has text)
        expect(screen.getAllByTitle(/Has text/i).length).toBe(1);
    });

    it('renders the "Add More" button at the end', () => {
        renderWithContext();
        expect(screen.getByText(/Add More/i)).toBeInTheDocument();
    });
});

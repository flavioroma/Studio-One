import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Timeline } from './Timeline';
import { LanguageProvider } from '../../contexts/LanguageContext';
import { TextColor, TextPosition, TextSize, FilterMode, BorderSize } from '../../types';

describe('Timeline', () => {
  const mockSlides = [
    {
      id: '1',
      file: new File([], 'img1.jpg'),
      previewUrl: 'blob:1',
      captionSettings: {
        text: 'Slide 1',
        color: TextColor.White,
        position: TextPosition.Center,
        textSize: TextSize.Small,
        isItalic: false,
      },
      framingSettings: {
        zoom: 1,
        offsetX: 0,
        offsetY: 0,
      },
      filterSettings: FilterMode.Normal,
      borderSettings: {
        size: BorderSize.None,
        color: TextColor.White,
      },
      watermarkSettings: undefined,
    },
    {
      id: '2',
      file: new File([], 'img2.jpg'),
      previewUrl: 'blob:2',
      captionSettings: {
        text: '',
        color: TextColor.White,
        position: TextPosition.Center,
        textSize: TextSize.Small,
        isItalic: false,
      },
      framingSettings: {
        zoom: 1,
        offsetX: 0,
        offsetY: 0,
      },
      filterSettings: FilterMode.Normal,
      borderSettings: {
        size: BorderSize.None,
        color: TextColor.White,
      },
      watermarkSettings: undefined,
    },
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
    expect(screen.getByText(/No slides yet. Add images to start/i)).toBeInTheDocument();
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
    // Slide 1 is customized, Slide 2 doesn't
    // The indicator has a title "Is customized" from translations
    const indicator = screen.getByTitle(/Is customized/i);
    expect(indicator).toBeInTheDocument();

    // Check if there's only one such indicator (since only slide 1 is customized)
    expect(screen.getAllByTitle(/Is customized/i).length).toBe(1);
  });

  it('renders the "Add More" button only when slides are present', () => {
    const { rerender } = renderWithContext({ ...defaultProps, slides: [] });
    expect(screen.queryByText(/Add More/i)).not.toBeInTheDocument();

    rerender(
      <LanguageProvider>
        <Timeline {...defaultProps} />
      </LanguageProvider>
    );
    expect(screen.getByText(/Add More/i)).toBeInTheDocument();
  });
});

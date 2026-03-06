import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { PhotoverlaySidebar } from './PhotoverlaySidebar';
import { LanguageProvider } from '../../contexts/LanguageContext';
import { TextColor, TextPosition, TextSize } from '../../types';

describe('PhotoverlaySidebar', () => {
  const defaultProps = {
    itemsCount: 0,
    selectedItem: null,
    applyToAll: false,
    onApplyToAllChange: vi.fn(),
    onFileChange: vi.fn(),
    onCaptionUpdate: vi.fn(),
    onWatermarkUpdate: vi.fn(),
    onDeleteAll: vi.fn(),
  };

  const renderWithContext = (props = defaultProps) => {
    return render(
      <LanguageProvider>
        <PhotoverlaySidebar {...props} />
      </LanguageProvider>
    );
  };

  it('renders upload zone when empty', () => {
    renderWithContext();
    expect(screen.getByText(/Select or drop photos/i)).toBeInTheDocument();
  });

  it('renders "apply to all" toggle when items exist', () => {
    renderWithContext({ ...defaultProps, itemsCount: 1 });
    expect(screen.getByText(/Apply/i)).toBeInTheDocument();
  });

  it('calls onApplyToAllChange when checkbox is clicked', () => {
    renderWithContext({ ...defaultProps, itemsCount: 1 });
    const checkbox = screen.getByLabelText(/Apply this overlay to all photos/i);
    fireEvent.click(checkbox);
    expect(defaultProps.onApplyToAllChange).toHaveBeenCalled();
  });

  it('renders settings panels when items exist', () => {
    const mockItem = {
      id: '1',
      file: new File([], 'test.jpg'),
      imageUrl: '',
      captionSettings: {
        text: 'Hello',
        color: TextColor.White,
        position: TextPosition.BottomLeft,
        textSize: TextSize.Small,
        isItalic: false,
      },
      watermarkSettings: { file: null, position: TextPosition.TopRight, opacity: 0.2, scale: 0.2 },
      metadata: null,
      exifData: null,
    };
    renderWithContext({ ...defaultProps, itemsCount: 1, selectedItem: mockItem });

    expect(screen.getByDisplayValue('Hello')).toBeInTheDocument();
    expect(screen.getAllByText(/Watermark/i).length).toBeGreaterThan(0);
  });

  it('calls onDeleteAll when erase button is clicked', () => {
    renderWithContext({ ...defaultProps, itemsCount: 1 });
    const eraseBtn = screen.getByText(/Erase the project/i);
    fireEvent.click(eraseBtn);
    expect(defaultProps.onDeleteAll).toHaveBeenCalled();
  });
});

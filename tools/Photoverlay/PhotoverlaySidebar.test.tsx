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
    namingSettings: {
      keepOriginal: true,
      type: 'prefix' as const,
      value: '',
    },
    onNamingUpdate: vi.fn(),
    preserveMetadata: true,
    onPreserveMetadataChange: vi.fn(),
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

  it('renders general settings section when items exist', () => {
    renderWithContext({ ...defaultProps, itemsCount: 1 });
    expect(screen.getByText(/General Settings/i)).toBeInTheDocument();
  });

  it('does not render general settings section when no items exist', () => {
    renderWithContext({ ...defaultProps, itemsCount: 0 });
    expect(screen.queryByText(/General Settings/i)).not.toBeInTheDocument();
  });

  it('shows naming input when keepOriginal is false', () => {
    renderWithContext({
      ...defaultProps,
      itemsCount: 1,
      namingSettings: { keepOriginal: false, type: 'prefix', value: '' },
    });
    expect(screen.getByText(/Prefix/i)).toBeInTheDocument();
    expect(screen.getByText(/Suffix/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Type something/i)).toBeInTheDocument();
  });

  it('does not show naming input when keepOriginal is true', () => {
    renderWithContext({
      ...defaultProps,
      itemsCount: 1,
      namingSettings: { keepOriginal: true, type: 'prefix', value: '' },
    });
    expect(screen.queryByText(/Prefix/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Suffix/i)).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/Type something/i)).not.toBeInTheDocument();
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

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { CaptionSettingsPanel } from './CaptionSettingsPanel';
import { LanguageProvider } from '../contexts/LanguageContext';
import { TextColor, TextPosition, TextSize } from '../types';
import { translations } from '../translations';

describe('CaptionSettingsPanel', () => {
  const t = translations.en;

  const defaultProps = {
    settings: {
      text: 'Test Caption',
      color: TextColor.White,
      position: TextPosition.BottomLeft,
      textSize: TextSize.Small,
      isItalic: false,
    },
    onUpdate: vi.fn(),
  };

  const renderWithContext = (props = defaultProps) => {
    return render(
      <LanguageProvider defaultLanguage="en">
        <CaptionSettingsPanel {...props} />
      </LanguageProvider>
    );
  };

  it('renders the caption text accurately', () => {
    renderWithContext();
    const textarea = screen.getByDisplayValue('Test Caption');
    expect(textarea).toBeInTheDocument();
  });

  it('calls onUpdate when text is changed', () => {
    renderWithContext();
    const textarea = screen.getByDisplayValue('Test Caption');
    fireEvent.change(textarea, { target: { value: 'New Text' } });
    expect(defaultProps.onUpdate).toHaveBeenCalledWith({ text: 'New Text' });
  });

  it('calls onUpdate when italic toggle is clicked', () => {
    renderWithContext();
    const italicBtn = screen.getByText(t.captions.italic);
    fireEvent.click(italicBtn);
    expect(defaultProps.onUpdate).toHaveBeenCalledWith({ isItalic: true });
  });

  it('calls onUpdate when text size is changed', () => {
    renderWithContext();
    const largeBtn = screen.getByText(t.captions.textSizes.Large);
    fireEvent.click(largeBtn);
    expect(defaultProps.onUpdate).toHaveBeenCalledWith({ textSize: TextSize.Large });
  });

  it('calls onUpdate when position selection is changed', () => {
    renderWithContext();
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: TextPosition.TopCenter } });
    expect(defaultProps.onUpdate).toHaveBeenCalledWith({ position: TextPosition.TopCenter });
  });

  it('calls onUpdate when color is selected', () => {
    renderWithContext({
      ...defaultProps,
      settings: { ...defaultProps.settings, color: TextColor.White },
    });

    // Find Red color button (hex #ef4444)
    // Note: Color names in the title come from the TextColor enum keys, which are currently not localized in the component.
    const redBtn = screen.getByTitle('Red');
    fireEvent.click(redBtn);
    expect(defaultProps.onUpdate).toHaveBeenCalledWith({ color: TextColor.Red });
  });
});


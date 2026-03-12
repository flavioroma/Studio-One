import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { WatermarkSettingsPanel } from './WatermarkSettingsPanel';
import { LanguageProvider } from '../contexts/LanguageContext';
import { TextPosition } from '../types';

describe('WatermarkSettingsPanel', () => {
  const defaultProps = {
    settings: {
      file: null,
      position: TextPosition.TopRight,
      opacity: 0.5,
      scale: 0.5,
    },
    onUpdate: vi.fn(),
  };

  const renderWithContext = (props = defaultProps) => {
    return render(
      <LanguageProvider>
        <WatermarkSettingsPanel {...props} />
      </LanguageProvider>
    );
  };

  it('renders upload zone when no file is present', () => {
    renderWithContext();
    expect(screen.getByText(/Upload Watermark/i)).toBeInTheDocument();
  });

  it('calls onUpdate when a file is selected', () => {
    renderWithContext();
    const file = new File(['hello'], 'watermark.png', { type: 'image/png' });
    const input = screen.getByLabelText(/Upload Watermark/i) as HTMLInputElement;

    fireEvent.change(input, { target: { files: [file] } });
    expect(defaultProps.onUpdate).toHaveBeenCalledWith({ file });
  });

  it('renders settings when a file is present', () => {
    const file = new File(['hello'], 'watermark.png', { type: 'image/png' });
    global.URL.createObjectURL = vi.fn(() => 'mock-url');

    renderWithContext({
      ...defaultProps,
      settings: { ...defaultProps.settings, file },
    });

    expect(screen.getByText('watermark.png')).toBeInTheDocument();
    expect(screen.getByText(/Position/i)).toBeInTheDocument();
    expect(screen.getByText(/Size/i)).toBeInTheDocument();
    expect(screen.getByText(/Opacity/i)).toBeInTheDocument();
  });

  it('calls onUpdate when position is changed', () => {
    const file = new File(['hello'], 'watermark.png', { type: 'image/png' });
    renderWithContext({
      ...defaultProps,
      settings: { ...defaultProps.settings, file },
    });

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: TextPosition.BottomLeft } });
    expect(defaultProps.onUpdate).toHaveBeenCalledWith({ position: TextPosition.BottomLeft });
  });

  it('calls onUpdate when scale slider is moved', () => {
    const file = new File(['hello'], 'watermark.png', { type: 'image/png' });
    renderWithContext({
      ...defaultProps,
      settings: { ...defaultProps.settings, file },
    });

    const sliders = screen.getAllByRole('slider');
    const sizeSlider = sliders[0]; // First one is Size
    fireEvent.change(sizeSlider, { target: { value: '80' } });
    expect(defaultProps.onUpdate).toHaveBeenCalledWith({ scale: 0.8 });
  });

  it('calls onUpdate when opacity slider is moved', () => {
    const file = new File(['hello'], 'watermark.png', { type: 'image/png' });
    renderWithContext({
      ...defaultProps,
      settings: { ...defaultProps.settings, file },
    });

    const sliders = screen.getAllByRole('slider');
    const opacitySlider = sliders[1]; // Second one is Opacity
    fireEvent.change(opacitySlider, { target: { value: '20' } });
    expect(defaultProps.onUpdate).toHaveBeenCalledWith({ opacity: 0.2 });
  });

  it('calls onUpdate with null when remove is clicked', () => {
    const file = new File(['hello'], 'watermark.png', { type: 'image/png' });
    renderWithContext({
      ...defaultProps,
      settings: { ...defaultProps.settings, file },
    });

    const removeBtn = screen.getByText(/Remove/i);
    fireEvent.click(removeBtn);
    expect(defaultProps.onUpdate).toHaveBeenCalledWith({ file: null });
  });
});

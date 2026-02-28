import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { VideoverlaySidebar } from './VideoverlaySidebar';
import { LanguageProvider } from '../../contexts/LanguageContext';
import { Rotation, AudioMode, TextColor, TextPosition, TextSize } from '../../types';

describe('VideoverlaySidebar', () => {
    const defaultProps = {
        file: null,
        metadata: null,
        rotation: Rotation.None,
        audioMode: AudioMode.Keep,
        audioFile: null,
        captionSettings: {
            text: '',
            color: TextColor.White,
            position: TextPosition.BottomLeft,
            textSize: TextSize.Small,
            isItalic: false
        },
        watermarkSettings: {
            file: null,
            position: TextPosition.TopRight,
            opacity: 0.2,
            scale: 0.2
        },
        onFileChange: vi.fn(),
        onRotationChange: vi.fn(),
        onAudioModeChange: vi.fn(),
        onAudioFileChange: vi.fn(),
        onRemoveAudioFile: vi.fn(),
        onCaptionUpdate: vi.fn(),
        onWatermarkUpdate: vi.fn(),
        onDelete: vi.fn(),
    };

    const renderWithContext = (props = defaultProps) => {
        return render(
            <LanguageProvider>
                <VideoverlaySidebar {...props} />
            </LanguageProvider>
        );
    };

    it('renders upload section when no file is selected', () => {
        renderWithContext();
        expect(screen.getByText(/Select a video/i)).toBeInTheDocument();
        expect(screen.getByText(/Upload Video/i)).toBeInTheDocument();
    });

    it('renders editing controls when file is present', () => {
        const file = new File([''], 'video.mp4', { type: 'video/mp4' });
        renderWithContext({ ...defaultProps, file });

        expect(screen.getByText(/Rotation/i)).toBeInTheDocument();
        expect(screen.getAllByText(/Audio/i).length).toBeGreaterThan(0);
        expect(screen.getByText(/Overlay/i)).toBeInTheDocument();
        expect(screen.getByText(/Butta via il progetto|Erase the project/i)).toBeInTheDocument();
    });

    it('calls onRotationChange when rotation button is clicked', () => {
        const file = new File([''], 'video.mp4', { type: 'video/mp4' });
        renderWithContext({ ...defaultProps, file });

        const rot90Btn = screen.getByText('90° CW');
        fireEvent.click(rot90Btn);
        expect(defaultProps.onRotationChange).toHaveBeenCalledWith(Rotation.CW_90);
    });

    it('calls onAudioModeChange when audio option is clicked', () => {
        const file = new File([''], 'video.mp4', { type: 'video/mp4' });
        renderWithContext({ ...defaultProps, file });

        const removeAudioBtn = screen.getByText(/Rimuovi|Remove/i);
        fireEvent.click(removeAudioBtn);
        expect(defaultProps.onAudioModeChange).toHaveBeenCalledWith(AudioMode.Remove);
    });

    it('shows audio upload when audio mode is Replace', () => {
        const file = new File([''], 'video.mp4', { type: 'video/mp4' });
        renderWithContext({ ...defaultProps, file, audioMode: AudioMode.Replace });

        expect(screen.getByText(/Select Audio/i)).toBeInTheDocument();
    });

    it('calls onDelete when erase button is clicked', () => {
        const file = new File([''], 'video.mp4', { type: 'video/mp4' });
        renderWithContext({ ...defaultProps, file });

        const eraseBtn = screen.getByText(/Erase the project/i);
        fireEvent.click(eraseBtn);
        expect(defaultProps.onDelete).toHaveBeenCalled();
    });
});

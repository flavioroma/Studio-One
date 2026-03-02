import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { FileDropZone } from './FileDropZone';

describe('FileDropZone', () => {
    const defaultProps = {
        onFilesSelected: vi.fn(),
        label: 'Upload File',
        themeColor: 'tool-videoverlay',
    };

    it('renders correctly with label', () => {
        render(<FileDropZone {...defaultProps} />);
        expect(screen.getByText('Upload File')).toBeInTheDocument();
    });

    it('calls onFilesSelected when files are selected via input', () => {
        render(<FileDropZone {...defaultProps} />);
        const input = screen.getByTestId('file-input') as HTMLInputElement;
        const file = new File(['hello'], 'hello.png', { type: 'image/png' });

        fireEvent.change(input, {
            target: { files: [file] },
        });

        expect(defaultProps.onFilesSelected).toHaveBeenCalled();
    });

    it('triggers click on hidden input when clicked', () => {
        render(<FileDropZone {...defaultProps} />);
        const dropZone = screen.getByText('Upload File').closest('div');
        const input = screen.getByTestId('file-input') as HTMLInputElement;

        const clickSpy = vi.spyOn(input, 'click');
        fireEvent.click(dropZone!);
        expect(clickSpy).toHaveBeenCalled();
    });

    it('handles drag over and drag leave states', () => {
        render(<FileDropZone {...defaultProps} />);
        const dropZone = screen.getByText('Upload File').closest('div');

        fireEvent.dragOver(dropZone!);
        expect(dropZone).toHaveClass('border-tool-videoverlay');
        expect(dropZone).toHaveClass('bg-tool-videoverlay/10');

        fireEvent.dragLeave(dropZone!);
        expect(dropZone).not.toHaveClass('border-tool-videoverlay');
        expect(dropZone).toHaveClass('border-slate-600');
    });

    it('calls onFilesSelected when files are dropped', () => {
        render(<FileDropZone {...defaultProps} />);
        const dropZone = screen.getByText('Upload File').closest('div');
        const file = new File(['hello'], 'hello.png', { type: 'image/png' });

        const dropEvent = {
            dataTransfer: {
                files: [file],
                items: [{ kind: 'file', type: 'image/png', getAsFile: () => file }],
                types: ['Files'],
            },
        };

        fireEvent.drop(dropZone!, dropEvent);

        expect(defaultProps.onFilesSelected).toHaveBeenCalled();
    });
});

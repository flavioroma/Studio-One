import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ConfirmationModal } from './ConfirmationModal';
import { AlertTriangle } from 'lucide-react';

describe('ConfirmationModal', () => {
    const defaultProps = {
        isOpen: true,
        onClose: vi.fn(),
        onConfirm: vi.fn(),
        title: 'Delete Item',
        message: 'Are you sure?',
        Icon: AlertTriangle,
    };

    it('renders correctly when open', () => {
        render(<ConfirmationModal {...defaultProps} />);
        expect(screen.getByText('Delete Item')).toBeInTheDocument();
        expect(screen.getByText('Are you sure?')).toBeInTheDocument();
        expect(screen.getByText('Confirm')).toBeInTheDocument();
        expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    it('does not render when closed', () => {
        const { container } = render(<ConfirmationModal {...defaultProps} isOpen={false} />);
        expect(container.firstChild).toBeNull();
    });

    it('calls onClose when cancel button is clicked', () => {
        render(<ConfirmationModal {...defaultProps} />);
        fireEvent.click(screen.getByText('Cancel'));
        expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it('calls onConfirm when confirm button is clicked', () => {
        render(<ConfirmationModal {...defaultProps} />);
        fireEvent.click(screen.getByText('Confirm'));
        expect(defaultProps.onConfirm).toHaveBeenCalled();
    });
});

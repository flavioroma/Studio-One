import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ConfirmationModal } from './ConfirmationModal';
import { LanguageProvider } from '../contexts/LanguageContext';
import { translations } from '../translations';
import { AlertTriangle } from 'lucide-react';

describe('ConfirmationModal', () => {
  const t = translations.en;

  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onConfirm: vi.fn(),
    title: 'Delete Item',
    message: 'Are you sure?',
    Icon: AlertTriangle,
  };

  const renderWithContext = (props = defaultProps) => {
    return render(
      <LanguageProvider defaultLanguage="en">
        <ConfirmationModal {...props} />
      </LanguageProvider>
    );
  };

  it('renders correctly when open', () => {
    renderWithContext();
    expect(screen.getByText('Delete Item')).toBeInTheDocument();
    expect(screen.getByText('Are you sure?')).toBeInTheDocument();
    expect(screen.getByText(t.common.yesRemove)).toBeInTheDocument();
    expect(screen.getByText(t.common.cancel)).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    const { container } = renderWithContext({ ...defaultProps, isOpen: false });
    expect(container.firstChild).toBeNull();
  });

  it('calls onClose when cancel button is clicked', () => {
    renderWithContext();
    fireEvent.click(screen.getByText(t.common.cancel));
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('calls onConfirm when confirm button is clicked', () => {
    renderWithContext();
    fireEvent.click(screen.getByText(t.common.yesRemove));
    expect(defaultProps.onConfirm).toHaveBeenCalled();
  });
});


import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Lightbox } from '@/components/Lightbox';

const defaultProps = {
  src: '/photos/test/photo.jpg',
  alt: 'Mountain view',
  isOpen: true,
  onClose: vi.fn(),
};

describe('Lightbox', () => {
  it('renders the image when isOpen is true', () => {
    render(<Lightbox {...defaultProps} />);
    const img = screen.getByRole('img', { name: /Mountain view/i });
    expect(img).toBeInTheDocument();
  });

  it('does not render when isOpen is false', () => {
    render(<Lightbox {...defaultProps} isOpen={false} />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('calls onClose when Escape key is pressed', () => {
    const onClose = vi.fn();
    render(<Lightbox {...defaultProps} onClose={onClose} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when the backdrop is clicked', () => {
    const onClose = vi.fn();
    render(<Lightbox {...defaultProps} onClose={onClose} />);
    const dialog = screen.getByRole('dialog');
    fireEvent.click(dialog);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

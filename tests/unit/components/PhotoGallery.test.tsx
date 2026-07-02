import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PhotoGallery } from '@/components/PhotoGallery';
import type { Photo } from '@/lib/posts';

const photos: Photo[] = [
  { filename: 'photo-001.jpg', caption: 'Morning light', lat: 48.7, lng: -121.4 },
  { filename: 'photo-002.jpg' },
];

describe('PhotoGallery', () => {
  it('renders the correct number of images', () => {
    render(<PhotoGallery slug="test-post" photos={photos} />);
    expect(screen.getAllByRole('img')).toHaveLength(2);
  });

  it('shows caption text when a caption is present', () => {
    render(<PhotoGallery slug="test-post" photos={photos} />);
    expect(screen.getByText('Morning light')).toBeInTheDocument();
  });

  it('does not render a caption element when caption is absent', () => {
    render(<PhotoGallery slug="test-post" photos={[{ filename: 'solo.jpg' }]} />);
    expect(screen.queryByRole('figure')).toBeNull();
  });

  it('renders without error when given an empty photos array', () => {
    const { container } = render(<PhotoGallery slug="test-post" photos={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('opens a lightbox with the full photo when clicked', async () => {
    const user = userEvent.setup();
    render(<PhotoGallery slug="test-post" photos={photos} />);

    expect(screen.queryByRole('dialog')).toBeNull();
    await user.click(screen.getByRole('button', { name: /view larger photo: morning light/i }));

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByRole('img')).toHaveAttribute('alt', 'Morning light');
  });

  it('closes the lightbox on Escape', async () => {
    const user = userEvent.setup();
    render(<PhotoGallery slug="test-post" photos={photos} />);

    await user.click(screen.getByRole('button', { name: /view larger photo: morning light/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

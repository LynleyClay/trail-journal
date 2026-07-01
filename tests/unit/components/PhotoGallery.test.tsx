import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
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
});

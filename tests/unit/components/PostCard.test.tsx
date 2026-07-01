import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PostCard } from '@/components/PostCard';
import type { Post } from '@/lib/posts';

const mockPost: Post = {
  id: 'cascade-loops-2026-06',
  slug: 'cascade-loops-2026-06',
  title: 'Cascade Loops',
  date: '2026-06-15',
  excerpt: 'Three days of alpine lakes in the North Cascades.',
  coverPhoto: 'cover.jpg',
  trail: 'PCT',
  published: true,
  photos: [{ filename: 'cover.jpg' }],
};

describe('PostCard', () => {
  it('renders the trail name', () => {
    render(<PostCard post={mockPost} />);
    expect(screen.getByText('Cascade Loops')).toBeInTheDocument();
  });

  it('renders the excerpt', () => {
    render(<PostCard post={mockPost} />);
    expect(screen.getByText(/Three days of alpine lakes/)).toBeInTheDocument();
  });

  it('links to the correct post URL', () => {
    render(<PostCard post={mockPost} />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/posts/cascade-loops-2026-06');
  });

  it('renders a formatted date', () => {
    render(<PostCard post={mockPost} />);
    // Date formatted as "June 15, 2026" or similar
    expect(screen.getByText(/June|2026/)).toBeInTheDocument();
  });

  it('renders the cover image with an img element', () => {
    render(<PostCard post={mockPost} />);
    const img = screen.getByRole('img');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('alt');
  });
});

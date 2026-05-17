'use client';

import BookCard from './BookCard';

interface Book {
  id: number;
  title: string;
  author: string;
  cover_url: string;
  last_chapter: string;
  total_chapters: number;
  progress_chapter_id?: number | null;
  progress_scroll?: number | null;
}

interface Props {
  books: Book[];
  onDelete?: (id: number) => void;
}

export default function BookGrid({ books, onDelete }: Props) {
  if (books.length === 0) return null;
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {books.map(book => (
        <BookCard key={book.id} book={book} onDelete={onDelete} />
      ))}
    </div>
  );
}

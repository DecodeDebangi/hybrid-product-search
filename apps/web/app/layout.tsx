import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Findwise',
  description: 'Visual and semantic product search: BM25, CLIP vectors and hybrid ranking side by side.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

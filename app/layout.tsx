import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Laporan Keuangan Kos Abu-Abu Surabaya',
  description: 'Sistem Laporan Keuangan Real-time Kos Abu-Abu',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <head>
        <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body>{children}</body>
    </html>
  );
}

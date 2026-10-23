import type {Metadata} from 'next';
import './globals.css'; // Global styles

export const metadata: Metadata = {
  title: 'Portal Pengurusan Aset Alih & e-JAS POLIKU',
  description: 'Portal Pengurusan dan Perancangan Pemeriksaan Aset Alih Kerajaan (1PP AM 2.4), Sistem e-JAS, dan Kompilasi Pra-JKPAK Politeknik Kuching Sarawak.',
  openGraph: {
    title: 'Portal Pengurusan Aset Alih & e-JAS POLIKU',
    description: 'Portal Pengurusan dan Perancangan Pemeriksaan Aset Alih Kerajaan (1PP AM 2.4), Sistem e-JAS, dan Kompilasi Pra-JKPAK Politeknik Kuching Sarawak.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Portal Pengurusan Aset Alih & e-JAS POLIKU',
    description: 'Portal Pengurusan dan Perancangan Pemeriksaan Aset Alih Kerajaan (1PP AM 2.4), Sistem e-JAS, dan Kompilasi Pra-JKPAK Politeknik Kuching Sarawak.',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}

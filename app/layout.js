import './globals.css';

export const metadata = {
  title: 'Rental Kanban',
  description: 'Track rental applications on a shareable kanban board',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

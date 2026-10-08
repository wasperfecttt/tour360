import './globals.css';

export const metadata = {
  title: 'Tour360',
  description: 'Онлайн-туры по квартирам из 360° панорам',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}

import './globals.css';

export const metadata = {
  title: 'Catalogo de materiais',
  description: 'Busque por codigo ou descricao para conferir o item certo antes de separar.'
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}

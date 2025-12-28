import './globals.css';
import ClerkProviderWrapper from './ClerkProviderWrapper';

export const metadata = {
  title: "PDF RAG",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <ClerkProviderWrapper>
          {children}
        </ClerkProviderWrapper>
      </body>
    </html>
  );
}

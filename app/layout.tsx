import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Hot Takes 🔥',
  description: 'Stem anoniem op controversiële stellingen — raad daarna wie wat stemde.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl">
      <body style={{
        margin: 0,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        background: '#0f0f13',
        color: '#f0f0f5',
        minHeight: '100vh',
      }}>
        {children}
      </body>
    </html>
  )
}

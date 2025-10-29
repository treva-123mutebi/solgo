import type { Metadata } from 'next'
import './globals.css'
import WalletContextProvider from './components/WalletContextProvider'


export const metadata: Metadata = {
  title: 'SolGo — Natural-language Solana',
  description: 'Ask questions like “Who holds the most CHILLGUY tokens?” and get actionable CTAs.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-sol-night text-white">
        <WalletContextProvider>{children}</WalletContextProvider>
      </body>
    </html>
  )
}

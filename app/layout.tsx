import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Dice Art Planner',
  description: 'Image Rendering with Dice',
  generator: 'mathematicalmichael with v0.dev',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}

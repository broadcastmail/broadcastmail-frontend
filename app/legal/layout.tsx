import Link from 'next/link'
import './legal-content.css'

export default function LegalRootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <header className="sticky top-0 z-10 bg-background/82 backdrop-blur-[12px] border-b border-border">
        <div className="max-w-[1160px] mx-auto px-6 h-[60px] flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2 flex-shrink-0">
            <div
              className="w-5 h-5 rounded-[5px] bg-orange flex items-center justify-center font-mono text-[12px] font-semibold text-[#120C06]"
              aria-hidden="true"
            >
              b
            </div>
            <span className="font-mono text-[13px] font-medium text-text-primary">
              broadcastmail
            </span>
          </Link>

          <nav className="flex-1 flex items-center gap-6 text-[14px] text-text-muted overflow-hidden h-[22px]">
            <Link href="/#how" className="whitespace-nowrap hover:text-text-primary transition-colors">
              How it works
            </Link>
            <Link href="/#features" className="whitespace-nowrap hover:text-text-primary transition-colors">
              Features
            </Link>
            <Link href="/#pricing" className="whitespace-nowrap hover:text-text-primary transition-colors">
              Pricing
            </Link>
          </nav>

          <div className="flex items-center gap-5 flex-shrink-0">
            <Link href="/" className="text-[14px] text-text-muted hover:text-text-primary transition-colors whitespace-nowrap">
              Sign in
            </Link>
            <Link
              href="/"
              className="whitespace-nowrap bg-orange text-[#120C06] text-[13.5px] font-semibold rounded-lg px-3.5 py-2 hover:bg-orange-hover transition-colors"
            >
              Connect Supabase
            </Link>
          </div>
        </div>
      </header>

      <main>{children}</main>

      <footer className="border-t border-border">
        <div className="max-w-[1160px] mx-auto px-6 py-8 flex items-center gap-6 flex-wrap">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-[4px] bg-orange flex items-center justify-center font-mono text-[10px] font-semibold text-[#120C06]" aria-hidden="true">
              b
            </div>
            <span className="font-mono text-[12.5px] text-text-primary">broadcastmail</span>
          </Link>
          <div className="flex-1" />
          <nav className="flex gap-[22px] flex-wrap text-[13.5px]">
            <Link href="/legal/privacy" className="text-text-muted hover:text-text-primary transition-colors">Privacy</Link>
            <Link href="/legal/terms" className="text-text-muted hover:text-text-primary transition-colors">Terms</Link>
          </nav>
          <span className="font-mono text-[12px] text-text-dim">© 2026</span>
        </div>
      </footer>
    </>
  )
}

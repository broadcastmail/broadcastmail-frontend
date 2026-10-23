import Link from 'next/link'
import type {LegalPage} from '@/lib/legal'
import {LegalSidebar} from './legal-sidebar'

interface LegalLayoutProps {
  page: LegalPage
  activeTab: 'privacy' | 'terms'
}

export function LegalLayout({ page, activeTab }: LegalLayoutProps) {
  return (
    <div className="max-w-[1160px] mx-auto px-6">
      <div className="pt-[clamp(64px,9vw,104px)] flex flex-col gap-4">
        <div className="flex gap-2 font-mono text-[12.5px]">
          <Link
            href="/legal/privacy"
            className={`px-2.5 py-[5px] rounded-md transition-colors ${
              activeTab === 'privacy'
                ? 'bg-white/[0.07] text-text-primary'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            privacy
          </Link>
          <Link
            href="/legal/terms"
            className={`px-2.5 py-[5px] rounded-md transition-colors ${
              activeTab === 'terms'
                ? 'bg-white/[0.07] text-text-primary'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            terms
          </Link>
        </div>

        <h1 className="m-0 text-[clamp(38px,5vw,56px)] leading-[1.05] font-semibold tracking-[-0.04em] text-text-primary">
          {page.title}
        </h1>

        <p className="font-mono text-[12.5px] text-text-muted">
          Last updated {page.lastUpdated}
        </p>
      </div>

      <div className="py-14 flex gap-[clamp(32px,6vw,80px)] flex-wrap items-start pb-[clamp(96px,12vw,140px)]">
        <LegalSidebar headings={page.headings} />

        <div className="flex-1 min-w-0 max-w-[680px] flex flex-col gap-14">
          {page.summary.length > 0 && (
            <div className="flex flex-col gap-4 p-6 border border-border rounded-xl bg-card">
              <h2 className="m-0 text-[18px] font-semibold tracking-[-0.015em] text-text-primary">
                Short version
              </h2>
              <ol className="flex flex-col gap-2.5 list-none p-0 m-0">
                {page.summary.map((item, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="font-mono text-[13px] text-text-dim pt-[2px] flex-shrink-0">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="text-[15.5px] leading-[1.7] text-[#B9B9C2]">{item}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          <div
            className="legal-content text-[15.5px] leading-[1.7] text-[#B9B9C2]"
            dangerouslySetInnerHTML={{ __html: page.contentHtml }}
          />
        </div>
      </div>
    </div>
  )
}

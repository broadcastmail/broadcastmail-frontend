'use client'

import {useEffect, useState} from 'react'
import type {LegalHeading} from '@/lib/legal'

interface LegalSidebarProps {
  headings: LegalHeading[]
}

export function LegalSidebar({ headings }: LegalSidebarProps) {
  const [activeId, setActiveId] = useState<string>(headings[0]?.id ?? '')

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id)
          }
        }
      },
      { rootMargin: '-80px 0px -60% 0px', threshold: 0 },
    )

    for (const { id } of headings) {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    }

    return () => observer.disconnect()
  }, [headings])

  return (
    <nav
      aria-label="On this page"
      className="flex-none w-[200px] sticky top-[92px] flex flex-col gap-0.5 text-[13.5px]"
    >
      <span className="text-[11.5px] font-medium tracking-[0.04em] uppercase text-text-dim pb-2.5">
        On this page
      </span>
      {headings.map(({ id, text }) => (
        <a
          key={id}
          href={`#${id}`}
          className={`py-[5px] transition-colors ${
            activeId === id
              ? 'text-text-primary'
              : 'text-text-muted hover:text-text-primary'
          }`}
        >
          {text}
        </a>
      ))}
    </nav>
  )
}

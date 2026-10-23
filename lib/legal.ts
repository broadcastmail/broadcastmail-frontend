import fs from 'node:fs'
import path from 'node:path'
import {remark} from 'remark'
import remarkGfm from 'remark-gfm'
import remarkHtml from 'remark-html'
import sanitizeHtml from 'sanitize-html'
import {visit} from 'unist-util-visit'
import {toString} from 'mdast-util-to-string'
import {load as parseYaml} from 'js-yaml'
import type {Heading, Root} from 'mdast'

export interface LegalHeading {
  id: string
  text: string
}

export interface LegalPage {
  title: string
  lastUpdated: string
  summary: string[]
  headings: LegalHeading[]
  contentHtml: string
}

const ALLOWED_LINK_PATTERNS = [
  /^https:\/\/broadcastmail\.com/,
  /^https:\/\/stripe\.com/,
  /^https:\/\/resend\.com/,
  /^mailto:/,
  /^\/legal\//,
]

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
}

function parseFrontmatter(raw: string): { data: Record<string, unknown>; body: string } {
  if (!raw.startsWith('---')) return { data: {}, body: raw }

  const end = raw.indexOf('\n---', 3)
  if (end === -1) return { data: {}, body: raw }

  const data = (parseYaml(raw.slice(4, end)) ?? {}) as Record<string, unknown>
  const body = raw.slice(end + 4).trim()

  return { data, body }
}

export async function getLegalPage(slug: 'privacy' | 'terms'): Promise<LegalPage> {
  const filePath = path.join(process.cwd(), 'content', `${slug}.md`)
  const raw = fs.readFileSync(filePath, 'utf-8')

  const { data, body } = parseFrontmatter(raw)

  const headings: LegalHeading[] = []

  function collectAndIdHeadings() {
    return (tree: Root) => {
      visit(tree, 'heading', (node: Heading) => {
        if (node.depth !== 2) return
        const text = toString(node)
        const id = slugify(text)
        headings.push({ id, text })
        node.data = node.data ?? {}
        node.data.hProperties = { ...node.data.hProperties as object, id }
      })
    }
  }

  const processed = await remark()
    .use(remarkGfm)
    .use(collectAndIdHeadings)
    .use(remarkHtml, { sanitize: false })
    .process(body)

  const contentHtml = sanitizeHtml(processed.toString(), {
    allowedTags: [
      'h2', 'h3', 'p', 'ul', 'ol', 'li', 'strong', 'em', 'code', 'span',
      'table', 'thead', 'tbody', 'tr', 'th', 'td', 'a', 'br',
    ],
    allowedAttributes: {
      'a': ['href'],
      'h2': ['id'],
      'h3': ['id'],
      'span': ['class'],
      '*': [],
    },
    allowedClasses: {
      'span': ['legal-pro'],
    },
    transformTags: {
      a: (tagName, attribs) => {
        const href = attribs.href ?? ''
        const allowed = ALLOWED_LINK_PATTERNS.some((p) => p.test(href))
        return allowed ? { tagName, attribs } : { tagName: 'span', attribs: {} }
      },
    },
  })

  return {
    title: typeof data.title === 'string' ? data.title : '',
    lastUpdated: typeof data.lastUpdated === 'string' ? data.lastUpdated : '',
    summary: Array.isArray(data.summary) ? (data.summary as string[]) : [],
    headings,
    contentHtml,
  }
}

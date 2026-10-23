import type {Metadata} from 'next'
import {getLegalPage} from '@/lib/legal'
import {LegalLayout} from '../_components/legal-layout'

export const metadata: Metadata = {
  title: 'Terms of Service — BroadcastMail',
}

export default async function TermsPage() {
  const page = await getLegalPage('terms')
  return <LegalLayout page={page} activeTab="terms" />
}

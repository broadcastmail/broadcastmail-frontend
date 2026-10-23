import type {Metadata} from 'next'
import {getLegalPage} from '@/lib/legal'
import {LegalLayout} from '../_components/legal-layout'

export const metadata: Metadata = {
  title: 'Privacy Policy — BroadcastMail',
}

export default async function PrivacyPage() {
  const page = await getLegalPage('privacy')
  return <LegalLayout page={page} activeTab="privacy" />
}

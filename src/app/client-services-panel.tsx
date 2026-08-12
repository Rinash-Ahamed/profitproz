'use client'

import { useState } from 'react'
import type { PropertyRecord } from '@/lib/firestore'
import type { OnboardingRecord } from '@/lib/onboarding'
import { OnboardingPanel } from '@/app/onboarding-panel'
import { PropertiesPanel } from '@/app/properties-panel'

type ClientServicesPanelProps = {
  properties: PropertyRecord[]
  onboardings: OnboardingRecord[]
  loading: boolean
  onPropertiesChange: (properties: PropertyRecord[]) => void
  onOnboardingsChange: (onboardings: OnboardingRecord[]) => void
  readOnly?: boolean
  revenueEditor?: boolean
  onboardingEditor?: boolean
  showServiceCounts?: boolean
}

export function ClientServicesPanel({ properties, onboardings, loading, onPropertiesChange, onOnboardingsChange, readOnly = false, revenueEditor = false, onboardingEditor = false, showServiceCounts = false }: ClientServicesPanelProps) {
  const [service, setService] = useState<'revenue' | 'onboarding'>('revenue')

  return (
    <div className="space-y-5">
      {showServiceCounts ? <div className="grid gap-3 sm:grid-cols-2">
        <ServiceCount label="Revenue Management Properties" count={properties.length} loading={loading} />
        <ServiceCount label="OTA Onboarding Properties" count={onboardings.length} loading={loading} />
      </div> : null}
      <div className="surface flex flex-wrap gap-2 rounded-lg p-2">
        <button type="button" onClick={() => setService('revenue')} className={`rounded-md px-4 py-2.5 text-sm font-semibold transition-colors ${service === 'revenue' ? 'bg-[#66B159] text-white' : 'text-sub hover:bg-zinc-800 hover:text-ink'}`}>Revenue Management</button>
        <button type="button" onClick={() => setService('onboarding')} className={`rounded-md px-4 py-2.5 text-sm font-semibold transition-colors ${service === 'onboarding' ? 'bg-[#66B159] text-white' : 'text-sub hover:bg-zinc-800 hover:text-ink'}`}>OTA Onboarding</button>
      </div>

      {service === 'revenue'
        ? <PropertiesPanel properties={properties} loading={loading} onChange={onPropertiesChange} readOnly={readOnly && !revenueEditor} editorOnly={revenueEditor} />
        : <OnboardingPanel onboardings={onboardings} loading={loading} onChange={onOnboardingsChange} readOnly={readOnly && !onboardingEditor} editorOnly={onboardingEditor} />}
    </div>
  )
}

function ServiceCount({ label, count, loading }: { label: string; count: number; loading: boolean }) {
  return <div className="surface rounded-lg border border-zinc-800 px-5 py-4"><p className="text-xs font-medium uppercase tracking-wide text-ghost">{label}</p><p className="mt-2 text-2xl font-semibold text-ink">{loading ? '—' : count.toLocaleString('en-IN')}</p></div>
}

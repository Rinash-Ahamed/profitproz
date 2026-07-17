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
}

export function ClientServicesPanel({ properties, onboardings, loading, onPropertiesChange, onOnboardingsChange, readOnly = false }: ClientServicesPanelProps) {
  const [service, setService] = useState<'revenue' | 'onboarding'>('revenue')

  return (
    <div className="space-y-5">
      <div className="surface flex flex-wrap gap-2 rounded-lg p-2">
        <button type="button" onClick={() => setService('revenue')} className={`rounded-md px-4 py-2.5 text-sm font-semibold transition-colors ${service === 'revenue' ? 'bg-[#66B159] text-white' : 'text-sub hover:bg-zinc-800 hover:text-ink'}`}>Revenue Management</button>
        <button type="button" onClick={() => setService('onboarding')} className={`rounded-md px-4 py-2.5 text-sm font-semibold transition-colors ${service === 'onboarding' ? 'bg-[#66B159] text-white' : 'text-sub hover:bg-zinc-800 hover:text-ink'}`}>OTA Onboarding</button>
      </div>

      {service === 'revenue'
        ? <PropertiesPanel properties={properties} loading={loading} onChange={onPropertiesChange} readOnly={readOnly} />
        : <OnboardingPanel onboardings={onboardings} loading={loading} onChange={onOnboardingsChange} readOnly={readOnly} />}
    </div>
  )
}

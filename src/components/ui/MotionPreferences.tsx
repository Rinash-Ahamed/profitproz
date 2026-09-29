'use client'

import type { ReactNode } from 'react'
import { MotionConfig } from 'framer-motion'

export function MotionPreferences({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>
}

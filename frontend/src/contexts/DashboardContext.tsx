import { createContext, useContext, type ReactNode } from 'react'
import type { ApiRun, ApiSubmission } from '@/api'
import type { Beat, BeatEngagementTotals, Report } from '@/mock/types'

export interface DashboardContextValue {
  run: ApiRun
  submission: ApiSubmission
  submissionTitle: string
  report: Report
  beats: Beat[]
  provenance: string
  engagementTotals: BeatEngagementTotals
  personaCeiling: number
}

const DashboardContext = createContext<DashboardContextValue | null>(null)

export function DashboardProvider({
  value,
  children,
}: {
  value: DashboardContextValue
  children: ReactNode
}) {
  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>
}

export function useDashboard(): DashboardContextValue {
  const value = useContext(DashboardContext)
  if (!value) {
    throw new Error('useDashboard must be used within DashboardProvider')
  }
  return value
}

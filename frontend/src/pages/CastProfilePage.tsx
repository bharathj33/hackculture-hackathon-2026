import { ArrowLeft } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { CastProfileDetails } from '@/components/personas/CastProfileDetails'
import { FooterStrip } from '@/components/layout/AppShell'
import { TopBar } from '@/components/layout/TopBar'
import { parseCastProfile } from '@/lib/parseCastProfile'
import { useActivePanelId } from '@/hooks/useActivePanelId'
import { usePanelCast } from '@/hooks/usePanelCast'

export default function CastProfilePage() {
  const { handle = '' } = useParams<{ handle: string }>()
  const decodedHandle = decodeURIComponent(handle)
  const { panelId, panelName, loading: panelLoading } = useActivePanelId()
  const { cast, loading, error } = usePanelCast(panelId)
  const profile = cast.find((entry) => entry.handle === decodedHandle)
  const parsed = profile ? parseCastProfile(profile) : null

  return (
    <>
      <TopBar
        title={
          <div className="flex min-w-0 items-center gap-3">
            <Link
              to="/personas"
              aria-label="Back to personas"
              className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:outline-none"
            >
              <ArrowLeft className="size-4" />
            </Link>
            <div className="min-w-0">
              <h1 className="truncate text-xl font-semibold tracking-tight">
                {parsed?.displayName ?? (decodedHandle || 'Cast profile')}
              </h1>
              <p className="truncate text-xs text-muted-foreground">
                {parsed?.group_label ?? 'Persona'} · cast roster
              </p>
            </div>
          </div>
        }
      />

      <main className="min-h-0 flex-1 overflow-y-auto p-6 lg:p-8">
        {panelLoading || loading ? (
          <p className="text-sm text-muted-foreground">Loading profile…</p>
        ) : error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : !profile ? (
          <p className="text-sm text-muted-foreground">Cast profile not found.</p>
        ) : (
          <CastProfileDetails profile={profile} panelName={panelName} />
        )}
      </main>

      <FooterStrip />
    </>
  )
}

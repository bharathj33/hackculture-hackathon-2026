import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { LayoutGrid, Plus, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { PRINCIPLE_LINE, TEAM } from '@/mock/data'

/**
 * Two destinations. `/new` is reached by the button above, so listing it here
 * too would repeat the duplicate the old nav had. Story History and Archive
 * were removed — neither had a backend.
 */
const NAV = [
  { to: '/runs', label: 'Runs', icon: LayoutGrid },
  { to: '/personas', label: 'Personas', icon: Users },
]

function Sidebar() {
  const navigate = useNavigate()

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground">
      <div className="px-5 pt-6 pb-5">
        <p className="text-lg font-bold tracking-tight">{TEAM.product}</p>
        <p className="label-caps mt-1 text-muted-foreground">Editorial Command</p>
      </div>

      <div className="px-3 pb-4">
        <Button className="w-full justify-center gap-2" onClick={() => navigate('/new')}>
          <Plus className="size-4" />
          New Analysis
        </Button>
      </div>

      <nav className="flex flex-col gap-1 px-3">
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                'focus-visible:ring-ring focus-visible:ring-[3px] focus-visible:outline-none',
                isActive
                  ? 'bg-secondary font-medium text-secondary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )
            }
          >
            <Icon className="size-4 shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto border-t px-5 py-4">
        <p className="label-caps text-muted-foreground">Team {TEAM.name}</p>
        <p className="mt-1 text-xs text-muted-foreground">{TEAM.event}</p>
      </div>
    </aside>
  )
}

export function FooterStrip({ right }: { right?: React.ReactNode }) {
  return (
    <footer className="flex h-11 shrink-0 items-center gap-4 border-t bg-background px-6 text-xs text-muted-foreground">
      <span className="italic">{PRINCIPLE_LINE}</span>
      <div className="ml-auto flex items-center gap-4">{right}</div>
    </footer>
  )
}

export default function AppShell() {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Outlet />
      </div>
    </div>
  )
}

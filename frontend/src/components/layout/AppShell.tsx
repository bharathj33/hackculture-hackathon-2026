import { createContext, useContext, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { LayoutGrid, Menu, Plus, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent } from '@/components/ui/sheet'
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

const MobileNavContext = createContext<React.ReactNode>(null)

/** Hamburger slot for TopBar — provided by AppShell on viewports below lg. */
export function useMobileNavSlot() {
  return useContext(MobileNavContext)
}

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const navigate = useNavigate()

  return (
    <>
      <div className="px-5 pt-6 pb-5">
        <p className="text-lg font-bold tracking-tight">{TEAM.product}</p>
        <p className="label-caps mt-1 text-muted-foreground">Editorial Command</p>
      </div>

      <div className="px-3 pb-4">
        <Button
          className="w-full justify-center gap-2"
          onClick={() => {
            onNavigate?.()
            navigate('/new')
          }}
        >
          <Plus className="size-4" />
          New Analysis
        </Button>
      </div>

      <nav className="flex flex-col gap-1 px-3">
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onNavigate}
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
    </>
  )
}

function DesktopSidebar() {
  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground lg:flex">
      <SidebarNav />
    </aside>
  )
}

function MobileNavTrigger({ onOpen }: { onOpen: () => void }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="shrink-0 lg:hidden"
      aria-label="Open navigation menu"
      onClick={onOpen}
    >
      <Menu className="size-5" />
    </Button>
  )
}

export function FooterStrip({ right }: { right?: React.ReactNode }) {
  return (
    <footer className="flex shrink-0 flex-col gap-2 border-t bg-background px-3 py-2.5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:gap-4 sm:px-4 sm:py-0 sm:min-h-11 lg:px-6">
      <span className="hidden truncate italic sm:inline">{PRINCIPLE_LINE}</span>
      <div className="flex items-center gap-4 sm:ml-auto">{right}</div>
    </footer>
  )
}

export default function AppShell() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const closeMobileNav = () => setMobileNavOpen(false)

  return (
    <MobileNavContext.Provider value={<MobileNavTrigger onOpen={() => setMobileNavOpen(true)} />}>
      <div className="flex h-screen overflow-hidden bg-background">
        <DesktopSidebar />

        <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
          <SheetContent
            side="left"
            className="flex w-60 flex-col gap-0 border-r bg-sidebar p-0 text-sidebar-foreground sm:max-w-[15rem]"
          >
            <SidebarNav onNavigate={closeMobileNav} />
          </SheetContent>
        </Sheet>

        <div className="flex min-w-0 flex-1 flex-col">
          <Outlet />
        </div>
      </div>
    </MobileNavContext.Provider>
  )
}

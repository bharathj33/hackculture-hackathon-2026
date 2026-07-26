import { LogOut } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { clearToken } from '@/api'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useMobileNavSlot } from '@/components/layout/AppShell'
import { ThemeToggle } from './ThemeToggle'

interface TopBarProps {
  /** Page title block — an `<h1>` and optional strapline. */
  title: React.ReactNode
  /** Trailing action, e.g. Export Report. */
  action?: React.ReactNode
  /** Leading control — defaults to AppShell hamburger below lg. */
  menuSlot?: React.ReactNode
}

/**
 * Deliberately thin. The tab row, the search field and the notification bell
 * were removed: none of them were wired to anything, and all three read as
 * clickable. What remains is a title, one real action, and account controls.
 */
export function TopBar({ title, action, menuSlot }: TopBarProps) {
  const navigate = useNavigate()
  const mobileNavSlot = useMobileNavSlot()
  const leadingMenu = menuSlot ?? mobileNavSlot

  return (
    <header
      className={cn(
        'flex min-h-14 shrink-0 flex-wrap items-center gap-x-2 gap-y-2 border-b bg-background px-3 py-2',
        'sm:min-h-16 sm:gap-x-3 sm:px-4 sm:py-0',
        'lg:gap-x-4 lg:px-6',
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
        {leadingMenu}
        <div className="min-w-0 flex-1 truncate [&_h1]:truncate [&_p]:truncate">{title}</div>
      </div>

      <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 [&_button]:max-w-full">
        {action}
        <ThemeToggle />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full" aria-label="Account">
              <Avatar className="size-8">
                <AvatarFallback className="bg-secondary text-xs font-semibold text-secondary-foreground">
                  ED
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onSelect={() => {
                clearToken()
                navigate('/login')
              }}
            >
              <LogOut className="size-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}

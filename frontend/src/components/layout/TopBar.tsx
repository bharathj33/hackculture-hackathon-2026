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
import { ThemeToggle } from './ThemeToggle'

interface TopBarProps {
  /** Page title block — an `<h1>` and optional strapline. */
  title: React.ReactNode
  /** Trailing action, e.g. Export Report. */
  action?: React.ReactNode
}

/**
 * Deliberately thin. The tab row, the search field and the notification bell
 * were removed: none of them were wired to anything, and all three read as
 * clickable. What remains is a title, one real action, and account controls.
 */
export function TopBar({ title, action }: TopBarProps) {
  const navigate = useNavigate()

  return (
    <header className="flex h-16 shrink-0 items-center gap-4 border-b bg-background px-6">
      <div className="min-w-0 flex-1">{title}</div>

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
    </header>
  )
}

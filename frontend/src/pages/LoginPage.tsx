import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { BarChart3, Loader2, Lock, LogIn, User } from 'lucide-react'

import { AuthDisabledError, login, setToken, UnauthorizedError } from '@/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PRINCIPLE_LINE, TEAM } from '@/mock/data'

/* Leading room for the icon sitting inside each field; focus chrome comes from Input itself. */
const FIELD_CLASS = 'h-10 pl-9'

const ICON_CLASS =
  'pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground transition-colors peer-focus-visible:text-foreground'

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const redirectTo =
    (location.state as { from?: string } | null)?.from?.startsWith('/') === true
      ? (location.state as { from: string }).from
      : '/runs'
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setReady(true)
  }, [])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) return
    setPending(true)
    setError(null)
    try {
      await login(username, password)
      navigate(redirectTo)
    } catch (err) {
      if (err instanceof AuthDisabledError) {
        // Local dev: backend 503s with no JWT_SECRET and gates nothing. RequireAuth
        // only checks token presence, so store a sentinel the open backend ignores.
        setToken('auth-disabled')
        navigate(redirectTo)
      } else if (err instanceof UnauthorizedError) {
        setError('Invalid username or password.')
      } else {
        setError(err instanceof Error ? err.message : 'Sign-in failed.')
      }
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="relative flex min-h-[100dvh] flex-col overflow-hidden">
      {/* Waveform contours, sunk low behind the card. Decoration only — heavier in light, where the ground is near-white. */}
      <svg
        aria-hidden="true"
        viewBox="0 0 1440 320"
        preserveAspectRatio="none"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 w-full opacity-40 dark:opacity-30"
      >
        <path
          d="M0,160L48,176C96,192,192,224,288,213.3C384,203,480,149,576,144C672,139,768,181,864,181.3C960,181,1056,139,1152,128C1248,117,1344,139,1392,149.3L1440,160"
          fill="none"
          stroke="var(--primary)"
          strokeWidth="1"
        />
        <path
          d="M0,100L48,110C96,120,192,140,288,140C384,140,480,120,576,110C672,100,768,100,864,120C960,140,1056,180,1152,180C1248,180,1344,140,1392,120L1440,100"
          fill="none"
          stroke="var(--accent)"
          strokeWidth="1"
        />
      </svg>

      <main className="relative flex flex-1 items-center justify-center px-4 py-16">
        <div
          className={`w-full max-w-[420px] transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            ready ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
          }`}
        >
          <header className="pb-10">
            <p className="label-caps pb-3 text-muted-foreground">
              Team {TEAM.name} · {TEAM.event} Hackathon
            </p>
            <div className="flex items-center gap-3">
              <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
                <BarChart3 className="size-5" strokeWidth={2} aria-hidden="true" />
              </span>
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">StoryCritic</h1>
                <p className="label-caps pt-1 text-muted-foreground">Editorial Intelligence</p>
              </div>
            </div>
          </header>

          <Card className="relative gap-0 pt-11 pb-7">
            {/* The hard product principle, stamped as a tab over the card's top edge. */}
            <p className="absolute top-0 left-6 max-w-[calc(100%-3rem)] -translate-y-1/2 rounded-md bg-primary px-3 py-1.5 font-mono text-xs font-semibold tracking-[0.1em] text-balance text-primary-foreground uppercase shadow-sm">
              {PRINCIPLE_LINE.replace(/\.$/, '')}
            </p>

            <CardContent>
              <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="username">Username</Label>
                  <div className="relative">
                    <Input
                      id="username"
                      name="username"
                      autoComplete="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className={`peer ${FIELD_CLASS}`}
                    />
                    <User className={ICON_CLASS} aria-hidden="true" />
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={`peer ${FIELD_CLASS}`}
                    />
                    <Lock className={ICON_CLASS} aria-hidden="true" />
                  </div>
                </div>

                {error ? (
                  <p className="text-sm text-destructive" role="alert">
                    {error}
                  </p>
                ) : null}

                <Button
                  type="submit"
                  size="lg"
                  disabled={pending}
                  className="mt-1 w-full active:translate-y-px"
                >
                  {pending ? (
                    <>
                      <Loader2 className="animate-spin" aria-hidden="true" />
                      Signing in
                    </>
                  ) : (
                    <>
                      Sign In
                      <LogIn aria-hidden="true" />
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>

      <footer className="relative border-t border-border px-4 py-4 sm:px-8">
        <div className="mx-auto flex max-w-[1280px] flex-col items-center gap-2 text-xs text-muted-foreground sm:flex-row sm:justify-between">
          <p className="text-center sm:text-left">
            {TEAM.tagline} — built by Team {TEAM.name}.
          </p>
          <p className="label-caps text-center text-muted-foreground sm:text-right">
            {TEAM.event} · {TEAM.hosts} · {TEAM.venue}
          </p>
        </div>
      </footer>
    </div>
  )
}

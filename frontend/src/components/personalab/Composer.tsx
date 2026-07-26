import { SendHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { chatSuggestions } from '@/mock/data'

interface ComposerProps {
  handle: string
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  pending: boolean
}

export function Composer({ handle, value, onChange, onSubmit, pending }: ComposerProps) {
  return (
    <form
      className="shrink-0 border-t px-5 py-4"
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit()
      }}
    >
      <div className="mx-auto w-full max-w-3xl">
        <Label htmlFor="interrogate-question">Ask {handle}</Label>

        <div className="mt-2 flex gap-2">
          <Input
            id="interrogate-question"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            autoComplete="off"
            placeholder="Ask about a specific beat…"
            className="flex-1"
          />
          <Button
            type="submit"
            disabled={pending || value.trim().length === 0}
            className="active:translate-y-px"
          >
            Interrogate
            <SendHorizontal aria-hidden strokeWidth={1.5} />
          </Button>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {chatSuggestions.map((suggestion) => (
            <Button
              key={suggestion}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onChange(suggestion)}
            >
              {suggestion}
            </Button>
          ))}
        </div>

        {/* The only live region on the screen — the transcript itself stays silent. */}
        <p role="status" aria-live="polite" className="mt-2 h-4 text-xs text-muted-foreground">
          {pending ? `${handle} is answering…` : ''}
        </p>
      </div>
    </form>
  )
}

import { useId, useRef } from 'react'
import { CloudUpload, FileText, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

/**
 * Exactly what ingest accepts. DOCX is deliberately absent — the backend rejects
 * it with a 415, and advertising it here is how the demo earns a red toast.
 */
const ACCEPTED_EXTENSIONS = ['.txt', '.md', '.pdf', '.mp3', '.wav', '.m4a', '.mp4']

export interface StoryDraft {
  text: string
  file: File | null
}

interface StoryInputProps {
  value: StoryDraft
  onChange: (value: StoryDraft) => void
  disabled?: boolean
}

/** Paste surface plus its drop zone. Parent owns ingest and polling. */
export function StoryInput({ value, onChange, disabled = false }: StoryInputProps) {
  const transcriptId = useId()
  const fileId = useId()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const wordCount = value.text.trim() ? value.text.trim().split(/\s+/).length : 0
  const fileName = value.file?.name ?? null

  function clearFile() {
    onChange({ ...value, file: null })
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4">
      <div className="flex min-h-40 flex-1 flex-col gap-2 sm:min-h-56">
        <Label htmlFor={transcriptId}>Transcript</Label>
        <Textarea
          id={transcriptId}
          value={value.text}
          onChange={(event) => onChange({ text: event.target.value, file: null })}
          placeholder="Paste the episode transcript, script, or beat outline."
          disabled={disabled}
          className="field-sizing-fixed min-h-0 flex-1 resize-none leading-relaxed"
        />
        <p className="text-xs text-muted-foreground">
          <span className="font-mono tabular-nums">{wordCount.toLocaleString()}</span>{' '}
          {wordCount === 1 ? 'word' : 'words'} pasted
        </p>
      </div>

      <div
        onDragOver={(event) => {
          event.preventDefault()
        }}
        onDrop={(event) => {
          event.preventDefault()
          if (disabled) return
          const dropped = event.dataTransfer.files[0]
          if (dropped) onChange({ text: '', file: dropped })
        }}
        className={cn('shrink-0 rounded-xl border border-dashed transition-colors border-border bg-card')}
      >
        <input
          ref={fileInputRef}
          id={fileId}
          type="file"
          className="peer sr-only"
          accept={ACCEPTED_EXTENSIONS.join(',')}
          disabled={disabled}
          onChange={(event) => {
            const picked = event.target.files?.[0]
            if (picked) onChange({ text: '', file: picked })
          }}
        />
        <Label
          htmlFor={fileId}
          className={cn(
            'flex cursor-pointer flex-col items-center gap-2 rounded-xl px-4 py-5 text-center font-normal sm:px-6 sm:py-7 peer-focus-visible:ring-[3px] peer-focus-visible:ring-ring',
            disabled && 'pointer-events-none opacity-60',
          )}
        >
          <CloudUpload className="size-6 text-muted-foreground" aria-hidden />
          <span className="text-sm sm:text-base">
            Drop a file here, or{' '}
            <span className="font-medium underline underline-offset-4">browse</span>
          </span>
          <span className="max-w-full break-words font-mono text-[10px] text-muted-foreground sm:text-xs">
            {ACCEPTED_EXTENSIONS.join('  ')}
          </span>
        </Label>

        {fileName && (
          <p className="flex items-center gap-2 border-t px-4 py-2 text-xs">
            <FileText className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
            <span className="min-w-0 flex-1 truncate">{fileName}</span>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={clearFile}
              disabled={disabled}
              aria-label={`Remove ${fileName}`}
              className="hover:bg-muted hover:text-foreground dark:hover:bg-muted"
            >
              <X />
            </Button>
          </p>
        )}
      </div>
    </div>
  )
}

import { useEffect, useRef, useState } from 'react';
import * as api from '../api';
import type { ChatMessage, Persona } from '../types';

const AGENT_KEY = '__report_agent__';

interface Props {
  runId: string;
  personas: Persona[];
  open: boolean;
  initialPersonaId: string | null;
  onClose: () => void;
  onUnauthorized: () => void;
}

export default function ChatDrawer({
  runId,
  personas,
  open,
  initialPersonaId,
  onClose,
  onUnauthorized,
}: Props) {
  const [selected, setSelected] = useState<string>(initialPersonaId ?? AGENT_KEY);
  const [threads, setThreads] = useState<Record<string, ChatMessage[]>>({});
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) setSelected(initialPersonaId ?? AGENT_KEY);
  }, [open, initialPersonaId]);

  const messages = threads[selected] ?? [];

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages.length, selected, open]);

  if (!open) return null;

  const selectedPersona = personas.find((p) => p.id === selected) ?? null;
  const title =
    selected === AGENT_KEY ? 'Report Agent' : selectedPersona?.group_label ?? 'Persona';

  const send = async () => {
    const message = input.trim();
    if (!message || sending) return;
    const key = selected;
    setInput('');
    setError(null);
    setSending(true);
    setThreads((t) => ({
      ...t,
      [key]: [...(t[key] ?? []), { role: 'user', content: message }],
    }));
    try {
      const reply = await api.sendChat(runId, message, key === AGENT_KEY ? null : key);
      setThreads((t) => ({ ...t, [key]: [...(t[key] ?? []), reply] }));
    } catch (err) {
      if (err instanceof api.UnauthorizedError) {
        onUnauthorized();
        return;
      }
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <aside className="drawer" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-sidebar">
          <div className="drawer-head">
            <h3>Talk to the audience</h3>
            <button className="btn-close" onClick={onClose} aria-label="Close chat">
              ×
            </button>
          </div>
          <ul className="persona-list">
            <li>
              <button
                className={`persona-item ${selected === AGENT_KEY ? 'active' : ''}`}
                onClick={() => setSelected(AGENT_KEY)}
              >
                <span className="persona-name">Report Agent</span>
                <span className="muted small">Ask about the verdict</span>
              </button>
            </li>
            {personas.map((p) => (
              <li key={p.id}>
                <button
                  className={`persona-item ${selected === p.id ? 'active' : ''}`}
                  onClick={() => setSelected(p.id)}
                >
                  <span className="persona-name">{p.group_label}</span>
                  {p.dropped_at_beat != null ? (
                    <span className="badge badge-dropped">
                      dropped @ beat {p.dropped_at_beat}
                    </span>
                  ) : (
                    <span className="badge badge-stayed">finished</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="drawer-chat">
          <div className="chat-header">
            <strong>{title}</strong>
            {selectedPersona && <span className="muted small">{selectedPersona.profile}</span>}
          </div>
          <div className="chat-messages" ref={scrollRef}>
            {messages.length === 0 && (
              <p className="muted chat-empty">
                {selected === AGENT_KEY
                  ? 'Ask the report agent anything about the simulation results.'
                  : 'Ask this listener why they reacted the way they did.'}
              </p>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`chat-bubble ${m.role === 'user' ? 'user' : 'assistant'}`}>
                {m.content}
              </div>
            ))}
            {sending && <div className="chat-bubble assistant typing">…</div>}
          </div>
          {error && <p className="error-inline">{error}</p>}
          <div className="chat-input-row">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.nativeEvent.isComposing) return; // ignore IME confirm
                if (e.key === 'Enter') void send();
              }}
              placeholder={`Message ${title}…`}
            />
            <button className="btn btn-primary" onClick={() => void send()} disabled={sending || !input.trim()}>
              Send
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}

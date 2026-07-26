# StoryCritic frontend

Dashboard-style React client wired to the FastAPI backend at `http://localhost:8000`
(dev proxy: `/api` → `:8000`).

```bash
cd frontend
npm install
npm run dev     # http://localhost:5173
```

Default route is `/runs`. Auth is optional for local testing (see `backend/.env`).

## Stack

Vite 8 · React 19 · TypeScript · Tailwind v4 · shadcn/ui · React Router · Recharts

## Routes

| Route | Screen |
|---|---|
| `/runs` | Run ledger |
| `/runs/:runId` | Verdict dashboard |
| `/runs/:runId?tab=listeners` | Simulated listeners |
| `/runs/:runId?tab=timeline` | Beat timeline + swarm stats |
| `/runs/:runId/listeners/:personaId` | Interrogate one listener |
| `/personas` | Panel cast roster |
| `/new` | Submit story + start run |
| `/simulating` | Run progress |
| `/login` | Sign in (when auth enabled) |

## Data layer

- Live API: `src/api.ts` + hooks in `src/hooks/`
- Adapters: `src/lib/adaptReport.ts`, `adaptPersona.ts`, etc.
- Fixtures in `src/mock/data.ts` remain for simulation theater and branding copy only

## Scripts

```bash
npm run dev      # dev server
npm run build    # production build
npm run lint     # oxlint
npm run preview  # preview dist
```

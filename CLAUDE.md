# ChessCaster — Project Context for Claude

## Stack
- **Vite** + **React** (plain JSX, no TypeScript)
- **No external chess libraries** — all logic is custom
- **Vercel serverless functions** in `api/` proxy all Anthropic calls server-side
- Model: `claude-sonnet-4-20250514`

## Architecture
The entire app lives in one file: `src/chesscaster.jsx` (~1500 lines).

### Components
- `ChessCaster` — main component, owns all state, renders the three-tab shell
- `GameReview` — PGN paste + move-by-move AI review
- `CoachReview` — position analysis with persona-based coaching
- `CtrlBtn` — small styled button helper

### Key Modules Inside chesscaster.jsx
- **Board representation**: FEN parser (`fenToBoard`), move applicator (`applyMove`), path checker (`isPathClear`/`canReach`)
- **PGN parser**: `parsePGN` — builds a list of SAN moves from pasted PGN text
- **Commentary engine**: `generateCommentary` — decides when to call the API (`shouldCommentate`), detects openings (`detectOpening`) and drama (`detectDrama`)
- **ELO personas**: `ELO_PERSONAS` — three system prompts (800/1200/1800 ELO) that shape the AI commentary style
- **Chess rendering**: `PIECE_RENDER` — Unicode symbols with color + CSS textShadow for contrast; `sqColor` for square shading
- **TTS**: `window.speechSynthesis` — optional, toggled by user

### Three Tabs
1. **Broadcast** — live game entry, AI auto-commentary per move
2. **Game Review** — paste PGN, step through with per-move AI analysis
3. **Coach Review** — ask the coach about the current position

## Key Decisions
- API key is server-side only, never in the browser. Set `ANTHROPIC_API_KEY` as a Vercel environment variable.
- All Anthropic calls go through `/api/commentary` (broadcast) or `/api/review` (Game Review + Coach Review).
- Rate limit: 20 requests per IP per hour, enforced in the serverless functions.
- No external chess library: avoids bundle bloat, keeps the file self-contained.
- Single-file component: intentional — the entire app is one cohesive unit.

## Rules — Do Not Violate
1. **Do not rewrite chess logic** (`fenToBoard`, `parsePGN`, `isPathClear`, `canReach`, `applyMove`, `buildAllBoards`).
2. **Do not change the three-tab structure** (Broadcast, Game Review, Coach Review).
3. **Do not add new npm dependencies** without explicit user approval.
4. **Never call Anthropic directly from the browser** — all calls go through `/api/commentary` or `/api/review`.
5. **Every change must be followed by `npm run build`** to confirm it exits 0.
6. **No console.log, no TODOs, no placeholder code** in committed files.
7. **Fix build errors in a loop** — do not stop until build exits 0 with zero errors.

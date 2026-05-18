# ♟ ChessTalk

> AI sports commentary for chess. Think live broadcast booth — for your board.

ChessTalk puts a commentator behind every move. Paste a PGN, step through your game, and hear Claude call it like a sports broadcast — adapted to your level. Three tabs. Three voices. Zero chess libraries shipped.

---

## Features

### 📡 Broadcast
Enter moves live and get instant AI commentary as the game unfolds. Step through manually or hit auto-play and let it run. Stockfish 16 evaluates positions under the hood. Optional voice readout via the browser's speech API.

### 🔍 Game Review
Paste any PGN. ChessTalk parses the game, detects the opening, identifies key moments — blunders, brilliancies, turning points — and delivers a verdict with one concrete takeaway. Click any moment to jump to that position on the board.

### 🎓 Coach Review
The same game, reframed as a coaching session. The AI names the tactical pattern you missed, explains the *why* behind each error, and hands you a prioritized study plan. Built for players who want to improve, not just replay.

---

## Three voices

Switch the commentator to match your level:

| Persona | Vibe |
|---|---|
| **800 · Beginner** | Twitch energy. Short, hyped, plain English. Slips in definitions without lecturing. |
| **1200 · Club Player** | Gotham Chess on a deadline. Punchy, opening callouts, dry reactions. |
| **1800 · Advanced** | GM booth. Dense, precise, dry wit. Every word earns its place. |

---

## Stack

- **Vite + React 19** — plain JSX, no TypeScript, no framework overhead
- **No external chess libraries** — FEN parser, SAN move applicator, PGN parser all hand-rolled
- **Stockfish 16** via CDN web worker for real position evaluation
- **Claude Sonnet** (`claude-sonnet-4-20250514`) via Vercel serverless functions
- **Vercel** for hosting, API proxying, and security headers

The entire app lives in one file: `src/chesscaster.jsx`.

---

## Security

The Anthropic API key never touches the browser. All Claude calls route through `/api/commentary` (Broadcast) and `/api/review` (Game Review + Coach Review) — serverless functions that enforce a rate limit of **20 requests per IP per hour** and a 30-second timeout on every upstream call.

---

## Deploy

### Vercel (recommended)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/zzaitama/chesstalk)

Add one environment variable in the Vercel dashboard:

```
ANTHROPIC_API_KEY=sk-ant-...
```

That's it.

### Local dev

```bash
git clone https://github.com/zzaitama/chesstalk
cd chesstalk
npm install
cp .env.example .env.local
# add your ANTHROPIC_API_KEY to .env.local
npm run dev
```

---

## Project layout

```
chesstalk/
├── api/
│   ├── commentary.js   # Broadcast endpoint — rate limiting, 30s timeout, Cache-Control
│   └── review.js       # Game Review + Coach endpoint
├── src/
│   └── chesscaster.jsx # The entire app (~1500 lines)
├── vercel.json         # CSP, X-Frame-Options, security headers
└── index.html
```

---

## License

MIT

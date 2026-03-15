You are building the BICKOSA Alumni Portal — the digital home of the Bishop Cipriano Kihangire Old Students' Association (Luzira, Kampala, Uganda).

STACK: Next.js 15 (App Router), TypeScript, Drizzle ORM + Neon (PostgreSQL), BetterAuth, Cloudflare R2, Resend, Vercel, PostHog.

DESIGN SYSTEM — follow strictly:
- Primary colors: White (#ffffff) and Navy 900 (#0d1b3e). Pages are white/surface by default.
- Accent: Gold 500 (#c9a84c) — ONE CTA button, accent bar, or featured element per page. Never dominant.
- Surface: #f7f8fc (app bg), #f0f3fb (card bg alternate)
- Navy tint: #edf1f8 (emphasis panels), Navy 700: #1a3060 (hover/interactive)
- Font display/UI: 'Google Sans', 'Product Sans', Arial, sans-serif
- Font body: 'Inter', system-ui, sans-serif
- Border radius: cards 12–16px, buttons 8px, inputs 8px
- Shadows: subtle (0 1px 3px rgba(13,27,62,0.06) sm, 0 4px 12px rgba(13,27,62,0.09) md)
- Border: #e4e8f2 (default), #d4daf0 (emphasis)

COMPONENT CONVENTIONS:
- All pages use white background with navy text
- Navigation sidebar: navy 900 bg, white text, gold active indicator
- Primary buttons: navy 900 bg. Gold buttons: CTAs only (one per section)
- Cards: white bg, 1px #e4e8f2 border, 12-16px radius, sm shadow
- Form inputs: white bg, 1.5px #e4e8f2 border, focus border navy 400

CODE QUALITY:
- TypeScript strict mode throughout
- Server Components by default, Client Components only where interactivity required
- All database queries via Drizzle ORM (no raw SQL unless unavoidable)
- All forms use react-hook-form + zod validation
- All API routes use Next.js Route Handlers with proper error handling
- Environment variables via process.env with type-safe validation (t3-env or similar)
- Respect Uganda's Data Protection and Privacy Act 2019 — consent logging, user data controls, right to deletion

CONTEXT: The portal serves ~3,847 verified alumni across 12 chapters worldwide. Key engagement drivers are: sports league, events/galas, giving back (donations), mentorship, and the alumni directory.

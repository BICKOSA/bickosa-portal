# BICKOSA Alumni Portal

## Getting Started

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to access the app locally.

## Production Deployment (Vercel)

Complete this checklist before promoting to production:

1. Set all required environment variables in the Vercel dashboard.
2. Run database migrations against Neon production:
   ```bash
   npx drizzle-kit migrate
   ```
3. Configure Resend:
   - Verify your sending domain.
   - Set `RESEND_FROM_EMAIL`.
4. Configure Cloudflare R2:
   - Create the bucket.
   - Set a CORS policy to allow presigned uploads from `NEXT_PUBLIC_APP_URL`.
5. Configure PostHog:
   - Create the project.
   - Set both server and public keys in environment variables.
6. Set `BETTER_AUTH_URL` to your production domain.
7. Configure your custom domain in Vercel.
8. Enable Vercel Analytics (Edge) in project settings.

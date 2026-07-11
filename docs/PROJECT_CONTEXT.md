# Lawdi Project Context

## Product

Lawdi is a simple legal-practice management SaaS for Indian advocates, initially targeting solo lawyers and small chambers.

The application must be easy for users with basic computer familiarity.

## MVP

- Advocate authentication
- Advocate profile
- Clients
- Cases
- Hearings and hearing history
- Today's and upcoming hearings dashboard
- Tasks
- Document uploads
- Search
- Basic reminders

Do not implement billing, AI, WhatsApp integration, client portals, or eCourts integration yet.

## Technology

- Next.js
- React
- TypeScript
- App Router
- Tailwind CSS
- shadcn/ui
- Supabase
- PostgreSQL
- Supabase Auth
- Supabase Storage
- GitHub
- Vercel later

## Current Status

- GitHub account: lawdiapp
- Repository: lawdi
- Branch: main
- Next.js application created
- TypeScript enabled
- Tailwind enabled
- App Router enabled
- React Compiler disabled
- shadcn initialized using Base and Nova
- Supabase project created on Free plan
- Supabase Data API enabled
- Automatic table exposure disabled
- Automatic RLS enabled
- GitHub repository connected and initial code pushed
- Vercel not configured
- Database tables not created
- Supabase application connection must be verified

## Architecture

Use a simple modular monolith.

Do not introduce:

- Microservices
- Kubernetes
- Kafka
- Redis
- GraphQL
- A custom backend unless necessary

## Security

- Every application table must use Row Level Security.
- One lawyer or chamber must never access another tenant's data.
- Never expose Supabase service-role credentials.
- Database changes must be version-controlled migrations.
- Uploaded legal documents must use private storage policies.

## Immediate Next Step

Inspect the repository without modifying files.

Verify:

1. Git status
2. Installed packages
3. Environment-file protection
4. Supabase package installation
5. Existing Supabase configuration
6. Lint result
7. Production build result

Then recommend one next implementation step.
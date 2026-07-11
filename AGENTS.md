<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Lawdi Agent Instructions

Read `docs/PROJECT_CONTEXT.md` before planning or changing code.

Rules:

- Do not display or commit secrets.
- Keep `.env.local` out of Git.
- Never use the Supabase service-role key in browser code.
- Enable Row Level Security for every application table.
- Do not install packages without approval.
- Do not commit or push unless explicitly requested.
- Prefer simple MVP implementations.
- Run lint and build after code changes.
- Report all changed files and commands run.
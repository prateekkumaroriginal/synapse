# Synapse

Synapse is a Convex + React + Vite app for managing project workflows, tickets, generated artifacts, and asynchronous AI job processing.

## Tech Stack

- Convex for backend functions, database, auth, and HTTP worker endpoints
- React and Vite for the frontend
- Tailwind CSS and shadcn-style UI primitives
- Convex Auth with password-based sign-in
- A Node worker under `worker/` for async job execution

## Development

Install dependencies with pnpm:

```sh
pnpm install
```

Start the app:

```sh
pnpm dev
```

Run checks before submitting changes:

```sh
pnpm lint
pnpm build
```

## Worker

The worker is a separate package in `worker/`.

```sh
pnpm --dir worker install
pnpm --dir worker build
```

It expects `CONVEX_URL`, `WORKER_SECRET`, `POLL_INTERVAL_MS`, and `CLAIM_JOB_TYPE` at runtime.

FROM node:22-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates curl git \
  && rm -rf /var/lib/apt/lists/*

RUN corepack enable

WORKDIR /app

COPY worker/package.json worker/tsconfig.json ./

RUN pnpm install --frozen-lockfile=false

COPY worker/src ./src

RUN pnpm build

CMD ["pnpm", "start"]

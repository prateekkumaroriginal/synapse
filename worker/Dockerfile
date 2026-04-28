FROM node:22-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates curl git zsh \
  && rm -rf /var/lib/apt/lists/*

RUN corepack enable

RUN curl -fsSL https://forgecode.dev/cli | sh

ENV PATH="/root/.local/bin:${PATH}"
ENV FORGE_CONFIG=/app/forge-config

WORKDIR /app

COPY worker/package.json worker/tsconfig.json ./
COPY worker/forge-config ./forge-config

RUN pnpm install --frozen-lockfile=false

COPY worker/src ./src

RUN pnpm build

CMD ["pnpm", "start"]

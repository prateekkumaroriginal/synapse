FROM node:22-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends bash ca-certificates curl git ripgrep unzip zsh \
  && rm -rf /var/lib/apt/lists/*

RUN corepack enable

ENV PATH="/root/.forge/bin:/root/forge/bin:/root/.local/bin:${PATH}"
ENV FORGE_CONFIG=/app/forge-config

RUN curl -fsSL https://forgecode.dev/cli | sh

WORKDIR /app

COPY worker/package.json worker/tsconfig.json ./
COPY worker/forge-config ./forge-config

RUN pnpm install --frozen-lockfile=false

COPY worker/src ./src

RUN pnpm build

CMD ["pnpm", "start"]

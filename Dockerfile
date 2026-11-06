FROM oven/bun:1-slim AS base
WORKDIR /app

COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile

COPY . .
EXPOSE 3000

USER bun
ENTRYPOINT [ "bun", "run", "src/index.ts" ]
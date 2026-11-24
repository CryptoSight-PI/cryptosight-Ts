Purpose
- Quick, repo-specific instructions for OpenCode agents working on the app service. Only facts an agent would likely miss.

Quick facts
- Runtime: bun (not Node). Use bun for install, run and tests.
- Entrypoint: src/index.ts → app.listen(3000). Docker ENTRYPOINT runs `bun src/index.ts`.
- Work at the repository root for commands and editing.

Exact developer commands
- Install deps: bun install
- Dev server (watch): bun run --watch src/index.ts
- Run tests: bun test
- Run a single test file: bun test src/app.test.ts
- Docker build/run (parity): from app/:
  - build: docker build -t cryptosight-app .
  - run example: docker run --rm -p 3000:3000 -e REDIS_HOST=host.docker.internal -e DB_HOST=... cryptosight-app

Entrypoints and boundaries
-- This repository is a single service located at the repository root.
-- Main code: src/app.ts (DB queries, Redis keys, validation).
-- App server: src/index.ts.
-- Tests: src/app.test.ts — tests are the authoritative behavioral spec.

Environment variables the app expects
- DB_HOST, DB_USER, DB_PASSWORD, DB_NAME — used by mysql2/promise.
- REDIS_HOST (defaults to 'localhost'), REDIS_PORT (defaults to 6379).
- TTL_ONLINE_SEGUNDOS — default in code is 90 (seconds). Tests assume 90.

Redis keys and shapes (code is authoritative)
- device:status:<MAC> — JSON string with keys: ip, latenciaMs, jitterMs, perdaPct, downloadMbps, uploadMbps, ultimoContato. Set with EX TTL = TTL_ONLINE_SEGUNDOS.
- device:lastip:<MAC> — last known IP, set without expiration when status.ip is present.
-- Note: the previous README inside app/ was stale/conflicting. Trust code + tests over old docs.

Testing gotchas (high-impact)
- Tests mock mysql2/promise and ioredis before importing ./app. Always mock before importing the module when writing tests.
- Tests assert exact mocked call arguments (order and TTL). Changing key names, TTL, or argument ordering will break tests.
- Tests run under bun:test (not jest/mocha). Use bun test.

TypeScript / mysql2 typing note
- mysql2/promise pool.execute typings can be awkward with custom row types. If you see TS errors on calls like `pool.execute<MaquinaRow[]>`:
  - Minimal fix: cast the returned value:
    - const [rows] = (await pool.execute(sql, params)) as [MaquinaRow[], any]
  - Or use mysql RowDataPacket types and cast rows afterwards.
- Keep fixes minimal and local — broad typing changes may ripple under strict TS settings (tsconfig has "strict": true and uses bun-types).

CI / build / config
- No CI workflow or opencode.json in repo root to rely on. Dockerfile uses oven/bun:1-slim and `bun install --frozen-lockfile`.
- tsconfig.json: strict TypeScript with skipLibCheck and types: ["bun-types"].

Development checklist (recommended for any agent work)
1. Ensure bun v1.x is installed.
2. bun install
3. Run tests: bun test (fix failing tests before changing behavior).
4. Start dev server: bun run --watch src/index.ts
5. If you change Redis keys or TTL, update tests accordingly.

Where to look first when investigating a bug
-- src/app.test.ts — behavioral spec and assertions (fastest way to learn expectations).
-- src/app.ts — implementation and authoritative keys/TTL.
-- Dockerfile and package.json — exact runtime commands used by Docker.

Commit guidance
- Use a small, explicit commit message. Example:
  - Add AGENTS.md: guidance for OpenCode agents
- Keep changes minimal and run `bun test` after edits.

Notes / gotchas to preserve
- README in app/ is partially stale; prioritize code/tests.
- Tests are intentionally strict about mocked call shapes — changing the order, TTL or key names without updating tests will fail test runs.

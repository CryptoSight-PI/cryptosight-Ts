# CryptoSight NOC — Serviço app

Descrição
- Este repositório contém o serviço `app` do sistema de monitoramento CryptoSight NOC. O serviço recebe POSTs com MAC e IP de dispositivos, valida os dados, grava métricas em MySQL e mantém o estado recente no Redis.

Visão técnica rápida
- Runtime: `bun` (não Node). Use bun para instalar, executar e testar.
- Entrypoint: `app/src/index.ts` (inicia o servidor em porta 3000).
- Lógica principal: `app/src/app.ts` (validação, consultas MySQL, gravações Redis).
- Testes: `app/src/app.test.ts` — servem como especificação comportamental e devem ser consultados para entender expectativas.

Comandos essenciais (executar dentro de `app/`)
- Instalar dependências: `bun install`
- Servidor de desenvolvimento com watch: `bun run --watch src/index.ts`
- Executar testes: `bun test`
- Executar um único arquivo de teste: `bun test src/app.test.ts`

Docker
- O `Dockerfile` usa `oven/bun:1-slim`, executa `bun install --frozen-lockfile` e inicia com `bun src/index.ts`.
- Exemplo:
  - Build: `docker build -t cryptosight-app .`
  - Run (exemplo): `docker run --rm -p 3000:3000 -e REDIS_HOST=host.docker.internal -e DB_HOST=... cryptosight-app`

Variáveis de ambiente importantes
- `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` — conexão MySQL (usada pelo pool `mysql2/promise`).
- `REDIS_HOST` (padrão `localhost`), `REDIS_PORT` (padrão `6379`).
- `TTL_ONLINE_SEGUNDOS` — valor padrão no código é `90` (segundos). Os testes assumem esse valor; altere os testes se mudar o TTL.

Chaves Redis e formato (fonte: código)
- `device:status:<MAC>` — valor é uma string JSON com campos: `ip`, `latenciaMs`, `jitterMs`, `perdaPct`, `downloadMbps`, `uploadMbps`, `ultimoContato`. Gravada com `EX = TTL_ONLINE_SEGUNDOS`.
- `device:lastip:<MAC>` — último IP conhecido; gravado sem expiração quando `status.ip` está presente.
- Observação: o `app/README.md` contém informação desatualizada (por exemplo, TTL de 6 horas). Priorize código e testes.

Testes e armadilhas comuns
- Os testes fazem mock de `mysql2/promise` e `ioredis` antes de importar `./app`. Ao criar novos testes, coloque mocks antes do import para evitar carregar dependências reais.

TypeScript e mysql2
- `tsconfig.json` está em modo estrito (`"strict": true`) e inclui `types: ["bun-types"]`.
- A tipagem de `pool.execute` do `mysql2` pode conflitar com tipos de linha customizados. Solução prática quando houver erro de tipo:
  - `const [rows] = (await pool.execute(sql, params)) as [MaquinaRow[], any]`
  - Ou usar `RowDataPacket[]` e converter depois.
- Prefira correções locais e mínimas para não propagar mudanças sob as configurações estritas do TypeScript.

Onde olhar primeiro ao investigar
- `app/src/app.test.ts` — descreve o comportamento esperado e exemplos de payloads válidos.
- `app/src/app.ts` — implementação e chaves/TTL definitivos.
- `app/package.json` e `app/Dockerfile` — comandos exatos de execução e instalação.

Observações finais
- Não há workflow de CI no repositório raiz; a verificação local é a maneira primária para validar mudanças.
- Mantenha alterações pequenas e rode `bun test` após edições que afetem comportamento, chaves Redis ou o formato de payload.

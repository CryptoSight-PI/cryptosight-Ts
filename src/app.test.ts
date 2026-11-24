import { test, expect, mock, beforeEach } from 'bun:test'

const execute = mock(async (..._args: any[]): Promise<any> => [[]])
const redisSet = mock(async (..._args: unknown[]) => 'OK')

mock.module('mysql2/promise', () => ({ default: { createPool: () => ({ execute }) } }))
mock.module('ioredis', () => ({ default: class { on() {} set = redisSet } }))

const { app } = await import('./app')

const enviar = (corpo: unknown) =>
  app.handle(new Request('http://localhost/api/v1/dispositivo/cadastro', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(corpo),
  }))

const base = { macAddress: 'A4:5E:60:1B:2C:90', ipAddress: '192.168.1.112', latenciaMs: 184, jitterMs: 18.6, perdaPct: 3.2 }

beforeEach(() => {
  execute.mockReset(); redisSet.mockClear()
  execute.mockImplementation(async (sql: string) =>
    sql.startsWith('SELECT') ? [[{ id: 12, mac_address: 'A4:5E:60:1B:2C:90', id_empresa: 1 }]] : [{}])
})

test('agente novo: salva download/upload no MySQL e no Redis, e guarda o último IP', async () => {
  const r = await enviar({ ...base, downloadMbps: 42.8, uploadMbps: 8.6 })
  expect(r.status).toBe(200)

  const insert = execute.mock.calls.find((c) => String(c[0]).startsWith('INSERT'))!
  expect(insert[0]).toContain('download_mbps, upload_mbps')
  expect(insert[1]).toEqual([12, 184, 18.6, 3.2, 42.8, 8.6])

  const [chave, valor, ex, ttl] = redisSet.mock.calls[0] as any[]
  expect(chave).toBe('device:status:A4:5E:60:1B:2C:90')
  expect(JSON.parse(valor)).toMatchObject({ ip: '192.168.1.112', downloadMbps: 42.8, uploadMbps: 8.6 })
  expect([ex, ttl]).toEqual(['EX', 90])
  expect(redisSet.mock.calls[1]).toEqual(['device:lastip:A4:5E:60:1B:2C:90', '192.168.1.112'])
})

test('download/upload são obrigatórios: sem eles a validação recusa', async () => {
  const r = await enviar(base)
  expect(r.status).toBe(422)
  expect(execute).not.toHaveBeenCalled()
})

test('null é aceito (o agente não conseguiu medir) e grava NULL', async () => {
  const r = await enviar({ ...base, downloadMbps: null, uploadMbps: null })
  expect(r.status).toBe(200)
  const insert = execute.mock.calls.find((c) => String(c[0]).startsWith('INSERT'))!
  expect(insert[1]).toEqual([12, 184, 18.6, 3.2, null, null])
})

test('dispositivo não cadastrado devolve 404 e não grava nada', async () => {
  execute.mockImplementation(async () => [[]])
  const r = await enviar({ ...base, downloadMbps: 1, uploadMbps: 1 })
  expect(r.status).toBe(404)
  expect(redisSet).not.toHaveBeenCalled()
})

test('download negativo é recusado pela validação', async () => {
  const r = await enviar({ ...base, downloadMbps: -5, uploadMbps: 1 })
  expect(r.status).toBe(422)
  expect(execute).not.toHaveBeenCalled()
})
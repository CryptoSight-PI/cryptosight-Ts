import mysql from 'mysql2/promise'
import { Elysia, t } from 'elysia'
import Redis from 'ioredis'

const TTL_ONLINE_SEGUNDOS = Number(process.env.TTL_ONLINE_SEGUNDOS ?? 90)

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
})

const redis = new Redis({
  host: process.env.REDIS_HOST ?? 'localhost',
  port: Number(process.env.REDIS_PORT ?? 6379),
})

redis.on('error', (err) => console.error('Erro no Redis:', err))
async function buscarMaquina(macAddress: string) {
  const [rows]: any = await pool.execute(
    `SELECT m.id, m.mac_address, e.id AS id_empresa
       FROM maquina m
       JOIN sessao s ON s.id = m.id_sessao
       JOIN farm f ON f.id = s.id_farm
       JOIN empresa e ON e.id = f.id_empresa
      WHERE m.mac_address = ?
      LIMIT 1`,
    [macAddress]
  )

  if (rows.length === 0) {
    return null
  }

  return {
    id: rows[0].id,
    macAddress: rows[0].mac_address,
    idEmpresa: rows[0].id_empresa,
  }
}

async function salvarColeta(
  idMaquina: number,
  latenciaMs: number | null,
  jitterMs: number | null,
  perdaPct: number
) {
  await pool.execute(
    'INSERT INTO coleta_rede (id_maquina, latencia_ms, jitter_ms, perda_pct) VALUES (?, ?, ?, ?)',
    [idMaquina, latenciaMs, jitterMs, perdaPct]
  )
}

async function salvarStatus(macAddress: string, status: object) {
  const chave = `device:status:${macAddress}`
  const valor = JSON.stringify(status)

  await redis.set(chave, valor, 'EX', TTL_ONLINE_SEGUNDOS)
}


export const app = new Elysia()
  .post('/api/v1/dispositivo/cadastro', async ({ body, set }) => {
    const { macAddress, ipAddress, latenciaMs, jitterMs, perdaPct } = body

    try {

      const maquina = await buscarMaquina(macAddress)

      if (maquina === null) {
        set.status = 404
        return {
          success: false,
          error: 'Dispositivo não cadastrado',
        }
      }

      await salvarColeta(maquina.id, latenciaMs, jitterMs, perdaPct)

      await salvarStatus(maquina.macAddress, {
        ip: ipAddress,
        latenciaMs,
        jitterMs,
        perdaPct,
        ultimoContato: new Date().toISOString(),
      })

      return {
        success: true,
        idEmpresa: maquina.idEmpresa,
        message: `O IP ${ipAddress} foi atribuído ao MAC ${maquina.macAddress} com sucesso!`,
      }
    } catch (error) {
      console.error('Erro ao registrar dispositivo:', error)
      set.status = 500
      return {
        success: false,
        error: 'Erro interno ao registrar dispositivo',
      }
    }
  }, {
    body: t.Object({
      macAddress: t.String({
        pattern: '^([0-9A-Fa-f]{2}:){5}([0-9A-Fa-f]{2})$',
      }),
      ipAddress: t.String({ format: 'ipv4' }),
      latenciaMs: t.Union([t.Number({ minimum: 0 }), t.Null()]),
      jitterMs: t.Union([t.Number({ minimum: 0 }), t.Null()]),
      perdaPct: t.Number({ minimum: 0, maximum: 100 }),
    }),
  })
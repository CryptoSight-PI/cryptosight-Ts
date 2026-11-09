import mysql from 'mysql2/promise'
import { Elysia, t } from 'elysia'
import Redis from 'ioredis'

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
})

const redis = new Redis({
  host: process.env.DB_HOST_REDIS || 'localhost',
  port: 6379,
})

export const app = new Elysia()
  .post('/api/v1/dispositivo/cadastro', async ({ body, set }) => {
    const { macAddress, ipAddress } = body

    try {
      const [rows]: any = await pool.execute(
        'SELECT id FROM dispositivos WHERE mac_address = ? LIMIT 1',
        [macAddress]
      )

      if (rows.length === 0) {
        set.status = 404
        return {
          success: false,
          error: 'Dispositivo não cadastrado',
        }
      }

      const redisKey = `device:mac:${macAddress}`

      const currentIp = await redis.get(redisKey)
      if (ipAddress === currentIp) {
        await redis.expire(redisKey, 21600)

        return {
          success: true,
          message: 'IP já está atualizado.',
        }
      }

      await redis.set(redisKey, ipAddress, 'EX', 21600)

      return {
        success: true,
        message: `O ip IP ${ipAddress} foi atribuido ao MAC ${macAddress} com sucesso! `,
      }
    } catch (error) {
      set.status = 500
      return {
        success: false,
        error: 'Erro ao gravar valores no banco',
      }
    }
  }, {
    body: t.Object({
      macAddress: t.String({
        pattern: '^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$'
      }),
      ipAddress: t.String({ format: 'ipv4' })
    })
  })
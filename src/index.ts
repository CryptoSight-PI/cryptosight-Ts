import { Elysia, t } from 'elysia'
import Redis from 'ioredis'

const redis = new Redis({
  host: 'localhost',
  port: 6379,
})

export const app = new Elysia()
  .post('/api/v1/device/register', async ({ body, set }) => {
    const { macAddress, ipAddress } = body

    try {
      const redisKey = `device:mac:${macAddress}`

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
      macAddress: t.String({ minLength: 10 }),
      ipAddress: t.String({ format: 'ipv4' }) 
    })
  })
  .listen(3000)

console.log(`A aplicação está rodando! ${app.server?.hostname}:${app.server?.port}`)
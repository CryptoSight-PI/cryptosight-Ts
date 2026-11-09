import { app } from './app'

app.listen(3000)

console.log(`A aplicação está rodando em ${app.server?.hostname}:${app.server?.port}`)
import dotenv from 'dotenv/config'
import { httpServer } from './src/app.js'
import { connectDB } from './src/config/db.js'
import { startWebSocketServer } from './src/config/ws.js'
import {} from './src/workers/index.js'

const startServer = async () => {

    const PORT = process.env.PORT || 5000

    try {
        await connectDB()
        httpServer.listen(PORT, () => console.log(`LISTENING ON PORT: ${PORT}`))
        startWebSocketServer({ httpServer })
    } catch (error) {
        console.log(`FAILED TO START SERVER`)
        process.exit(1)
    }
}

startServer()
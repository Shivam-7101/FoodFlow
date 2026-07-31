import dotenv from 'dotenv/config'
import { app } from './src/app.js'
import { connectDB } from './src/config/db.js'

const startServer = async () => {

    const PORT = process.env.PORT || 5000

    try {
        await connectDB()
        app.listen(PORT, () => console.log(`LISTENING ON PORT: ${PORT}`))
    } catch (error) {
        console.log(`FAILED TO START SERVER`)
        process.exit(1)
    }
}

startServer()
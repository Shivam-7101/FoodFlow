import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { authRouter } from './routes/auth.routes.js'
import { restaurantRouter } from './routes/restaurant.routes.js'
import { errorMiddleware } from './middlewares/error.middleware.js'
import cookieParser from 'cookie-parser'
import { adminRouter } from './routes/admin.routes.js'
import { foodRouter } from './routes/food.routes.js'

const app = express()

app.use(helmet());
app.use(cors({
    origin: process.env.CORS_ALLOWED_ORIGIN,
    methods: process.env.CORS_ALLOWED_METHODS ? process.env.CORS_ALLOWED_METHODS.split(',') : ['Get', 'Post'],
    credentials: process.env.CORS_CREDENTIALS === 'true'
}))
app.use(cookieParser())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use('/api/v1/auth', authRouter)
app.use('/api/v1/restaurants', restaurantRouter)
app.use('/api/v1/admin', adminRouter)
app.use('/api/v1/foods', foodRouter)

app.use(errorMiddleware)

export { app }
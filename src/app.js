import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { authRouter } from './routes/auth.routes.js'
import { restaurantRouter } from './routes/restaurant.routes.js'
import { errorMiddleware } from './middlewares/error.middleware.js'
import cookieParser from 'cookie-parser'
import { adminRouter } from './routes/admin.routes.js'
import { foodRouter } from './routes/food.routes.js'
import { deliveryPartnerRouter } from './routes/deliveryPartner.routes.js'
import { cartRouter } from './routes/cart.routes.js'
import { addressRouter } from './routes/address.routes.js'
import { orderRoutes } from './routes/order.routes.js'
import * as utils from './utils/index.js'

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
app.use('/api/v1/admins', adminRouter)
app.use('/api/v1/foods', foodRouter)
app.use('/api/v1/deliveryPartners', deliveryPartnerRouter)
app.use('/api/v1/cart', cartRouter)
app.use('/api/v1/addresses', addressRouter)
app.use('/api/v1/orders', orderRoutes)

app.use(errorMiddleware)

export { app }
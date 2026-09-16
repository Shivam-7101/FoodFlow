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
// ; (async () => {
//     const cart = await utils.cache.getCart({ userId: "6a70925e12bcb658014ab2c1", cartId: "6aa691a4de192f6004f88280", restaurantId: "6a7222d2e061f769de1a0e97" })
//     console.log(`1. CART EXIST: ${cart.status}`)

//     await new Promise(resolve => setTimeout(resolve, 500));
//     await utils.cache.invalidateCart({ cartId: "6aa6b6763e91cccf2cfb3472" })
//     console.log(`HELLO`)

//     const isCart = await utils.cache.getCart({ userId: "6a70925e12bcb658014ab2c1", cartId: "6aa691a4de192f6004f88280", restaurantId: "6a7222d2e061f769de1a0e97" })
//     console.log(`3. CART EXIST: ${isCart.status}`)
// })();

app.use(errorMiddleware)

export { app }
import { Router } from 'express'
import { authenticate } from '../middlewares/auth.middleware.js'
import * as orderControllers from '../controllers/order.controller.js'

export const orderRoutes = Router()

orderRoutes.post('/',authenticate, orderControllers.createOrder)
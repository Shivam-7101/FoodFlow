import { Router } from 'express'
import * as paymentControllers from '../controllers/payment.controllers.js'
import { authenticate } from '../middlewares/auth.middleware.js'


export const paymentRouter = Router()


paymentRouter.post('/:orderId/verify', authenticate, paymentControllers.verifyPaymentFromClient)

paymentRouter.post('/webhook/verify', paymentControllers.verifyWebhookSignature)
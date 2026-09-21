import { Router } from 'express'
import { authenticate } from '../middlewares/auth.middleware.js'
import * as addressControllers from '../controllers/address.controllers.js'

export const addressRouter = Router()


addressRouter.post('/', authenticate, addressControllers.createAddress)

addressRouter.get('/', authenticate, addressControllers.getAddress)

addressRouter.patch('/set-default/:addressId', authenticate, addressControllers.setAddressAsDefault)
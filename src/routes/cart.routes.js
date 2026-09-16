import { Router } from 'express'
import { authenticate } from '../middlewares/auth.middleware.js'
import * as cartController from '../controllers/cart.controller.js'

export const cartRouter = Router()

cartRouter.patch('/quantity', authenticate, cartController.addOrRemoveItemInCart)

cartRouter.get('/:cartId', authenticate, cartController.getCart)

cartRouter.delete('/:cartId', authenticate, cartController.emptyCart)
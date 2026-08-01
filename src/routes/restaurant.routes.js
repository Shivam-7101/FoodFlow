import { Router } from 'express'
import { authenticate } from '../middlewares/auth.middleware.js'
import * as restaurantController from '../controllers/restaurant.controller.js'
import { upload } from '../middlewares/multer.middleware.js'

export const restaurantRouter = Router()

restaurantRouter.post('/', authenticate, upload.fields([{ name: 'logo', maxCount: 1 }, { name: 'banner', maxCount: 1 }]), restaurantController.createRestaurant)
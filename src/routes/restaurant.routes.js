import { Router } from 'express'
import { authenticate } from '../middlewares/auth.middleware.js'
import * as restaurantController from '../controllers/restaurant.controller.js'
import { upload } from '../middlewares/multer.middleware.js'
import { authorizeRoles } from '../middlewares/authorizeRoles.middleware.js'

export const restaurantRouter = Router()

restaurantRouter.post('/', authenticate, authorizeRoles('CUSTOMER'), upload.fields([{ name: 'logo', maxCount: 1 }, { name: 'banner', maxCount: 1 }]), restaurantController.createRestaurant)

restaurantRouter.patch('/:id', authenticate, authorizeRoles('RESTAURANT_OWNER'), upload.fields([{ name: 'logo', maxCount: 1 }, { name: 'banner', maxCount: 1 }]), restaurantController.updateRestaurant)

restaurantRouter.delete('/:id', authenticate, authorizeRoles('RESTAURANT_OWNER'), restaurantController.deleteRestaurant)

restaurantRouter.get('/:id', authenticate, authorizeRoles('RESTAURANT_OWNER'), restaurantController.getRestaurant)
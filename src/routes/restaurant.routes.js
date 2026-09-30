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

restaurantRouter.patch('/:id/open', authenticate, authorizeRoles('RESTAURANT_OWNER'), restaurantController.setRestaurantStatusToOpen)

restaurantRouter.patch('/:id/close', authenticate, authorizeRoles('RESTAURANT_OWNER'), restaurantController.setRestaurantStatusToClose)

restaurantRouter.patch('/:orderId/accept', authenticate, authorizeRoles('RESTAURANT_OWNER'), restaurantController.acceptOrder)

restaurantRouter.patch('/:orderId/reject', authenticate, authorizeRoles('RESTAURANT_OWNER'), restaurantController.rejectOrder)

restaurantRouter.patch('/:orderId/prepare', authenticate, authorizeRoles('RESTAURANT_OWNER'), restaurantController.preparingOrder)
import { Router } from 'express'
import { authenticate } from '../middlewares/auth.middleware.js'
import { authorizeRoles } from '../middlewares/authorizeRoles.middleware.js'
import * as adminControllers from '../controllers/admin.controller.js'


export const adminRouter = Router()

adminRouter.post('/restaurant/requests', authenticate, authorizeRoles('ADMIN'), adminControllers.approveRestaurantCreationRequests)

adminRouter.post('/deliverypartners/requests', authenticate, authorizeRoles('ADMIN'), adminControllers.approveDeliveryPartnerRequests)

adminRouter.post('/users/:id/inactive', authenticate, authorizeRoles('ADMIN'), adminControllers.updateUserToInactive)

adminRouter.post('/restaurants/:id', authenticate, authorizeRoles('ADMIN'), adminControllers.removeRestaurantOwnerStatus)

adminRouter.post('/deliverypartners/:id', authenticate, authorizeRoles('ADMIN'), adminControllers.removeDeliveryPartnerStatus)
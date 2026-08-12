import { Router } from 'express'
import { authenticate } from '../middlewares/auth.middleware.js'
import { authorizeRoles } from '../middlewares/authorizeRoles.middleware.js'
import { upload } from '../middlewares/multer.middleware.js'
import * as foodController from '../controllers/food.controller.js'

export const foodRouter = Router()

foodRouter.post('/:restaurantId', authenticate, authorizeRoles('RESTAURANT_OWNER'), upload.array('foodImages', 5), foodController.createFood)

foodRouter.get('/', authenticate, foodController.getFoods)

foodRouter.patch('/:foodId/:restaurantId', authenticate, authorizeRoles('RESTAURANT_OWNER'), upload.array('foodImages', 5), foodController.updateFood)

foodRouter.delete('/:foodId', authenticate, authorizeRoles('RESTAURANT_OWNER'), foodController.deleteFood)

foodRouter.get('/:foodId', authenticate, foodController.getFoodDetails)
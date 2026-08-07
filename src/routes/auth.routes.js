import { Router } from 'express'
import * as authController from '../controllers/auth.controller.js'
import { authenticate } from '../middlewares/auth.middleware.js'
import { authorizeRoles } from '../middlewares/authorizeRoles.middleware.js'

export const authRouter = Router()

authRouter.post('/register', authController.signup)

authRouter.post('/login', authController.login)

authRouter.post('/refresh', authController.rotateRefreshToken)

authRouter.post('/logout', authenticate, authController.logout)

authRouter.post('/logout-all-devices', authenticate, authController.logoutFromAllDevices)

authRouter.post('/verify', authenticate, authorizeRoles('CUSTOMER'), authController.verifyEmailRequest)

authRouter.post('/verify/otp', authenticate, authorizeRoles('CUSTOMER'), authController.verifyEmailVerificationOtp)

authRouter.post('/password', authenticate, authController.changePassword)
import { Router } from 'express'
import * as deliveryPartnerControllers from '../controllers/deliveryPartner.controller.js'
import { authenticate } from '../middlewares/auth.middleware.js'
import { authorizeRoles } from '../middlewares/authorizeRoles.middleware.js'
import { upload } from '../middlewares/multer.middleware.js'


export const deliveryPartnerRouter = Router()

deliveryPartnerRouter.post('/', authenticate, authorizeRoles('CUSTOMER'), upload.fields([{ name: 'adhaarCard', maxCount: 1 }, { name: 'vehiclePaper', maxCount: 1 }]), deliveryPartnerControllers.createDeliveryPartner)

deliveryPartnerRouter.patch('/:deliveryPartnerId', authenticate, authorizeRoles('DELIVERY_PARTNER'), upload.fields([{ name: 'adhaarCard', maxCount: 1 }, { name: 'vehiclePaper', maxCount: 1 }]), deliveryPartnerControllers.updateDeliveryPartner)

deliveryPartnerRouter.delete('/:deliveryPartnerId', authenticate, authorizeRoles('DELIVERY_PARTNER'), deliveryPartnerControllers.deleteDeliveryPartner)

deliveryPartnerRouter.get('/:deliveryPartnerId', authenticate, authorizeRoles('DELIVERY_PARTNER'), deliveryPartnerControllers.getDeliveryPartnerDetails)
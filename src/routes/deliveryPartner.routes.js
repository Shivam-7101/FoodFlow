import { Router } from 'express'
import * as deliveryPartnerControllers from '../controllers/deliveryPartner.controller.js'
import { authenticate } from '../middlewares/auth.middleware.js'
import { authorizeRoles } from '../middlewares/authorizeRoles.middleware.js'
import { upload } from '../middlewares/multer.middleware.js'


export const deliveryPartnerRouter = Router()

deliveryPartnerRouter.post('/', authenticate, authorizeRoles('CUSTOMER'), upload.fields([{ name: 'adhaarCard', maxCount: 1 }, { name: 'vehiclePaper', maxCount: 1 }]), deliveryPartnerControllers.createDeliveryPartner)

deliveryPartnerRouter.patch('/:deliveryPartnerId', authenticate, authorizeRoles('DELIVERY_PARTNER'), upload.fields([{ name: 'adhaarCard', maxCount: 1 }, { name: 'vehiclePaper', maxCount: 1 }]), deliveryPartnerControllers.updateDeliveryPartner)

deliveryPartnerRouter.patch('/accept/:deliveryPartnerId/:orderId', authenticate, authorizeRoles('DELIVERY_PARTNER'), deliveryPartnerControllers.acceptOrder)

deliveryPartnerRouter.patch('/pick-up/:deliveryPartnerId/:orderId', authenticate, authorizeRoles('DELIVERY_PARTNER'), deliveryPartnerControllers.pickUpOrder)

deliveryPartnerRouter.patch('/out-for-delivery/:deliveryPartnerId/:orderId', authenticate, authorizeRoles('DELIVERY_PARTNER'), deliveryPartnerControllers.outForDelivery)

deliveryPartnerRouter.patch('/delivered/:deliveryPartnerId/:orderId', authenticate, authorizeRoles('DELIVERY_PARTNER'), deliveryPartnerControllers.orderDelivered)

deliveryPartnerRouter.delete('/:deliveryPartnerId', authenticate, authorizeRoles('DELIVERY_PARTNER'), deliveryPartnerControllers.deleteDeliveryPartner)

deliveryPartnerRouter.get('/:deliveryPartnerId', authenticate, authorizeRoles('DELIVERY_PARTNER'), deliveryPartnerControllers.getDeliveryPartnerDetails)
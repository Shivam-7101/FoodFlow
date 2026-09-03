import * as deliveryPartnerServices from '../services/deliveryPartner.services.js'
import * as utils from '../utils/index.js'

export const createDeliveryPartner = utils.asyncHandler(async (req, res) => {

    const deliveryPartner = await deliveryPartnerServices.createDeliveryPartner({ body: req.body, files: req?.files || [], user: req.auth.user })

    res.status(201).json(new utils.ApiResponse(201, { deliveryPartner }, 'request for delivery partner role has been send.'))
})

export const updateDeliveryPartner = utils.asyncHandler(async (req, res) => {

    const deliveryPartner = await deliveryPartnerServices.updateDeliveryPartner({ body: req.body, deliveryPartnerId: req.params.deliveryPartnerId, files: req?.files || [] })

    res.status(200).json(new utils.ApiResponse(200, { deliveryPartner }, 'delivery partner profile successfully updated.'))
})

export const getDeliveryPartnerDetails = utils.asyncHandler(async (req, res) => {

    const deliveryPartner = await deliveryPartnerServices.getDeliveryPartnerDetails({ user: req.auth.user, deliveryPartnerId: req.params.deliveryPartnerId })

    res.status(200).json(new utils.ApiResponse(200, { deliveryPartner }, 'delivery partner profile fetched successfully.'))
})

export const deleteDeliveryPartner = utils.asyncHandler(async (req, res) => {

    const deliveryPartner = await deliveryPartnerServices.deleteDeliveryPartner({ user: req.auth.user, deliveryPartnerId: req.params.deliveryPartnerId })

    res.status(200).json(new utils.ApiResponse(200, { deliveryPartner }, 'delivery partner profile deleted successfully.'))
})

export const setDeliveryPartnerStatusToOnline = utils.asyncHandler(async (req, res) => {

    const deliveryPartner = await deliveryPartnerServices.setDeliveryPartnerStatusToOnline({ user: req.auth.user, deliveryPartnerId: req.params.deliveryPartnerId })

    res.status(200).json(new utils.ApiResponse(200, { deliveryPartner }, 'delivery partner status set to online successfully.'))
})

export const setDeliveryPartnerStatusToOffline = utils.asyncHandler(async (req, res) => {

    const deliveryPartner = await deliveryPartnerServices.setDeliveryPartnerStatusToOffline({ user: req.auth.user, deliveryPartnerId: req.params.deliveryPartnerId })

    res.status(200).json(new utils.ApiResponse(200, { deliveryPartner }, 'delivery partner status set to offline successfully.'))
})
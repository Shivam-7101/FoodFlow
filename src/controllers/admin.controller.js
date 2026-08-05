import * as utils from '../utils/index.js'
import * as adminServices from '../services/admin.services.js'
import mongoose from 'mongoose'

export const updateUserToInactive = utils.asyncHandler(async (req, res) => {
    console.log(`ID: ${req.params?.id}`)
    console.log(typeof req.params.id)
    await adminServices.updateUserToInactive({ body: new mongoose.Types.ObjectId(req.params?.id) })

    res.status(200).json(new utils.ApiResponse(200, {}, 'account blocked successfuly.'))
})

export const approveRestaurantCreationRequests = utils.asyncHandler(async (req, res) => {

    await adminServices.approveRestaurantCreationRequests()

    res.status(200).json(new utils.ApiResponse(200, {}, 'restaurants request approved successfuly.'))
})

export const approveDeliveryPartnerRequests = utils.asyncHandler(async (req, res) => {

    await adminServices.approveDeliveryPartnerRequests()

    res.status(200).json(new utils.ApiResponse(200, {}, 'delivery partner creation approved.'))
})

export const removeRestaurantOwnerStatus = utils.asyncHandler(async (req, res) => {
    await adminServices.removeRestaurantOwnerStatus({ body: req.params?.id })

    res.status(200).json(new utils.ApiResponse(200, {}, 'restaurant suspended successfully.'))
})

export const removeDeliveryPartnerStatus = utils.asyncHandler(async (req, res) => {
    await adminServices.removeDeliveryPartnerStatus({ body: req.params?.id })

    res.status(200).json(new utils.ApiResponse(200, {}, 'delivery partner role suspended successfully.'))
})
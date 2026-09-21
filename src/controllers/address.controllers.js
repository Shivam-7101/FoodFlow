import { Address } from '../models/index.js'
import * as addressServices from '../services/address.services.js'
import * as utils from '../utils/index.js'

export const createAddress = utils.asyncHandler(async (req, res) => {

    const address = await addressServices.createAddress({ user: req.auth.user, body: req?.body || {} })

    res.status(201).json(new utils.ApiResponse(201, { address }, 'address created successfully.'))
})

export const setAddressAsDefault = utils.asyncHandler(async (req, res) => {

    const address = await addressServices.setAddressAsDefault({ user: req.auth.user, addressId: req.params?.addressId || "" })

    res.status(200).json(new utils.ApiResponse(200, { address }, 'address set to default successfully.'))
})

export const getAddress = utils.asyncHandler(async (req, res) => {

    const address = await addressServices.getAddress({ user: req.auth.user })
    res.status(200).json(new utils.ApiResponse(200, { address }, 'address fetched successfully.'))
})
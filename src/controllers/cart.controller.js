import * as utils from '../utils/index.js'
import * as cartServices from '../services/cart.services.js'

export const addOrRemoveItemInCart = utils.asyncHandler(async (req, res) => {
    // console.log('3 REQ BODY: ', JSON.stringify(req.body, null, 2))
    const cart = await cartServices.addOrRemoveItemInCart({ body: req.body, user: req.auth.user })

    res.status(200).json(new utils.ApiResponse(200, { cart }, 'quantity updated successfully.'))
})

export const getCart = utils.asyncHandler(async (req, res) => {
    const cart = await cartServices.getCart({ user: req.auth.user, cartId: req.params.cartId })

    res.status(200).json(new utils.ApiResponse(200, { cart }, 'cart details fetched successfully.'))
})

export const emptyCart = utils.asyncHandler(async (req, res) => {
    const cart = await cartServices.emptyCart({ user: req.auth.user, cartId: req.params.cartId })

    res.status(200).json(new utils.ApiResponse(200, { cart }, 'cart deleted successfully.'))
})
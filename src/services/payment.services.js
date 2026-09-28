import * as paymentValidation from '../validators/paymentValidation.js'
import { Order } from '../models/index.js'
import { ErrorCodes, NotFoundError, ValidationError, ForbiddenError, BadRequestError, InternalServerError } from '../errors/index.js'
import * as utils from '../utils/index.js'
import * as constants from '../constants.js'
import mongoose from "mongoose"
import { orderEventsEmitter, ORDER_EVENTS } from '../events/order.js'


export const verifyAndProcessOrderPayment = async ({ orderId, razorpayPaymentId, isSignatureValid }) => {

    // FIND THE ORDER AND VALIDATE PAYMENT THROUGH SIGNATURE
    // IF IT'S INVALID THROW AN ERROR
    // CHECK RESTAURANT IS CURRENTLY OPEN OR CLOSED, IF IT'S CLOSED THEN REFUND THE AMOUNT AND UPDATE THE ORDER AS REJECTED
    // UPDATE THE ORDER AS PAID 
    // SEND ORDER DETAILS TO RESTAURANT
    // SEND UPDATED ORDER TO USER

    const orderCache = await utils.cache.getOrder({ orderId })
    if (!orderCache.status) throw new NotFoundError(ErrorCodes.ORDER.ORDER_NOT_FOUND);
    const order = orderCache.data

    if (order.status === constants.ORDER_STATUS.PLACED) {
        return { status: true, message: 'order has been already placed.', order }
    }
    if (order.status === constants.ORDER_STATUS.REJECTED) {
        return { status: false, message: 'order has been rejected.', order }
    }
    if (order.status === constants.ORDER_STATUS.FAILED) {
        return { status: false, message: 'order request has been failed.', order }
    }
    if (order.status === constants.ORDER_STATUS.CANCELLED) {
        return { status: false, message: 'order has been cancelled.', order }
    }
    if (order.status === constants.ORDER_STATUS.REFUNDED) {
        return { status: false, message: "order's amount has been refunded.", order }
    }
    if (order.payment.status === constants.PAYMENT_STATUS.SUCCESS) {
        return { status: true, message: "order have been paid.", order }
    }
    if (order.payment.status === constants.PAYMENT_STATUS.REFUNDED) {
        return { status: false, message: "order's amount has been refunded.", order }
    }
    if (order.payment.method !== constants.PAYMENT_METHOD.ONLINE) throw new BadRequestError(`PAYMENT VERIFICATION ERR: invalid payment method to verify.`);

    if (!isSignatureValid) {
        const inValidSignatureOrder = await Order.findByIdAndUpdate(
            order._id,
            {
                $set: {
                    status: constants.ORDER_STATUS.CANCELLED,
                    'payment.status': constants.PAYMENT_STATUS.FAILED
                }
            },
            {
                returnDocument: 'after'
            }
        ).lean()
        await utils.cache.invalidateOrder({ orderId })
        return { status: false, message: 'invalid razorpay signature', order: inValidSignatureOrder }
    }

    const restaurantCache = await utils.cache.getRestaurant({ restaurantId: order.restaurantId })
    if (!restaurantCache.status || !restaurantCache?.data?.isActive || !restaurantCache?.data?.isOpen) {
        const invalidRestaurantOrder = await Order.findByIdAndUpdate(
            order._id,
            {
                $set: {
                    status: constants.ORDER_STATUS.REJECTED,
                    'payment.status': constants.PAYMENT_STATUS.PROCESSING
                }
            },
            {
                returnDocument: 'after'
            }
        ).lean()
        orderEventsEmitter.emit(ORDER_EVENTS.REFUND_REQUESTED, {
            paymentId: razorpayPaymentId,
            amount: order.summary.grandTotal,
            reason: 'restaurant is currently closed.'
        })

        await utils.cache.invalidateOrder({ orderId })

        return { status: false, message: 'restaurant is currently closed', order: invalidRestaurantOrder }
    }

    let updatedOrder = await Order.findOneAndUpdate(
        {
            _id: order._id,
            status: constants.ORDER_STATUS.PENDING_PAYMENT,
            'payment.status': constants.PAYMENT_STATUS.PENDING
        },
        {
            $set: {
                status: constants.ORDER_STATUS.PLACED,
                'payment.status': constants.PAYMENT_STATUS.SUCCESS,
                'payment.providerPaymentId': razorpayPaymentId,
                'payment.paidAt': new Date(Date.now())
            }
        },
        {
            returnDocument: 'after'
        }
    ).lean()
    if (updatedOrder) {
        await utils.cache.invalidateOrder({ orderId })
    }
    if (!updatedOrder) {
        const freshOrderFromDb = await Order.findById(order._id).lean()
        if (!freshOrderFromDb || (
            freshOrderFromDb?.status !== constants.ORDER_STATUS.PLACED || freshOrderFromDb?.payment.status !== constants.PAYMENT_STATUS.SUCCESS
        )) {

            orderEventsEmitter.emit(ORDER_EVENTS.REFUND_REQUESTED, {
                paymentId: razorpayPaymentId,
                amount: order.summary.grandTotal,
                reason: 'payment verification conflict or state mismatch.'
            })

            throw new InternalServerError(ErrorCodes.COMMON.SOMETHING_WENT_WRONG)
        }
        updatedOrder = freshOrderFromDb
    }

    // SEND ORDER REQUEST TO RESTAURANT
    orderEventsEmitter.emit(ORDER_EVENTS.SEND_ORDER_REQUEST_TO_RESTAURANT, {
        orderId: order._id,
        orderItems: order.items,
        restaurantId: order.restaurantId
    })

    return { status: true, message: 'order request has been sent to restaurant', order: updatedOrder }
}

export const verifyPaymentFromClient = async ({ body, orderId }) => {

    const result = paymentValidation.paymentBody.safeParse(body)
    if (!result.success) throw new ValidationError(`PAYMENT VERIFICATION ERR: ${result.error.issues.map(issue => issue.message).join(', ')}`);

    const order = await utils.cache.getOrder({ orderId })
    if (!order.status) throw new NotFoundError(ErrorCodes.ORDER.ORDER_NOT_FOUND);

    const isValid = utils.razorpay.validatePaymentVerification({
        razorpayOrderId: order.data.payment.providerOrderId,
        razorpayPaymentId: result.data.razorpay_payment_id,
        signature: result.data.razorpay_signature
    })

    return await verifyAndProcessOrderPayment({
        orderId,
        razorpayPaymentId: result.data.razorpay_payment_id,
        isSignatureValid: isValid
    })
}

export const verifyWebhookSignature = async ({ signature, body, rawBody }) => {

    try {
        if (!signature) {
            console.error('missing razorpay signature header.')
            return { status: 'ignored', message: 'missing signature.' }
        }

        const isValid = utils.razorpay.validateWebhookSignature({ reqBody: rawBody, signature })

        if (!isValid) {
            console.error('invalid webhook signature')
            return { status: 'ignored', message: 'invalid webhook signature.' }
        }

        if (body.event !== 'order.paid') {
            return { status: 'ignored', message: 'invalid webhook event.' }
        }

        console.log(`✅ Webhook verified successfully. Event type: ${body.event}.`);
        await verifyAndProcessOrderPayment({
            isSignatureValid: isValid,
            orderId: body.payload.order.entity.id,
            razorpayPaymentId: body.payload.payment.entity.id
        })
        return { status: 'success', message: 'webhook signature validated successfully.' }

    } catch (error) {
        console.error('RAZORPAY WEBHOOK ERR: ', error)
        return { status: 'ignored', message: 'something went wrong' }
    }
}
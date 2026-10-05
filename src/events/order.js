import { EventEmitter } from 'events'
import * as utils from '../utils/index.js'
import { wsEventEmitter, SOCKET_EVENTS } from '../config/ws.js'

export const ORDER_EVENTS = {
    REFUND_REQUESTED: 'order:refund:requested',
    SEND_ORDER_REQUEST_TO_RESTAURANT: 'order:send:request:restaurant',
    SEND_ORDER_REQUEST_TO_DELIVERY_PARTNER: 'order:send:request:deliverypartner',
    ORDER_PICKED_UP: 'order:status:pickedup',
    ORDER_DELIVERED: 'order:status:delivered',
    ORDER_OUT_FOR_DELIVERY: 'order:status:outfordelivery',
    ERROR: 'error',
    NEW_ORDER_TRIGGER: 'order:new:trigger',
};

class OrderEventsEmitter extends EventEmitter {

    constructor() {
        super();
        this._registerListeners();
    }

    _registerListeners() {
        this.on(ORDER_EVENTS.ERROR, (err) => {
            console.error("ORDER EVENT ERR: ", err)
        })

        this.on(ORDER_EVENTS.REFUND_REQUESTED, ({ paymentId, amount, reason }) => {
            setImmediate(async () => {
                try {
                    await utils.razorpay.refund({ paymentId, amount, reason })
                } catch (err) {
                    this.emit(ORDER_EVENTS.ERROR, err);
                }
            });
        });

        this.on(ORDER_EVENTS.SEND_ORDER_REQUEST_TO_RESTAURANT, ({ restaurantId, orderId, orderItems }) => {
            wsEventEmitter.emit(SOCKET_EVENTS.NEW_ORDER_TRIGGER, { restaurantId, orderId, orderItems })
        })

        this.on(ORDER_EVENTS.SEND_ORDER_REQUEST_TO_DELIVERY_PARTNER, ({ orderId, distance, deliveryPartnerId }) => {
            wsEventEmitter.emit(SOCKET_EVENTS.DELIVERY_PARTNER_NEW_ORDER, { orderId, distance, deliveryPartnerId })
        })

        this.on(ORDER_EVENTS.ORDER_PICKED_UP, ({ userId, orderId }) => {
            wsEventEmitter.emit(SOCKET_EVENTS.ORDER_PICKED_UP, { orderId, userId })
        })

        this.on(ORDER_EVENTS.ORDER_OUT_FOR_DELIVERY, ({ userId, orderId }) => {
            wsEventEmitter.emit(SOCKET_EVENTS.ORDER_OUT_FOR_DELIVERY, { orderId, userId })
        })

        this.on(ORDER_EVENTS.ORDER_DELIVERED, ({ userId, orderId }) => {
            wsEventEmitter.emit(SOCKET_EVENTS.ORDER_DELIVERED, { orderId, userId })
        })
    }
}

export const orderEventsEmitter = new OrderEventsEmitter()
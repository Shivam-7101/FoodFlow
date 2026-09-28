import { EventEmitter } from 'events'
import * as utils from '../utils/index.js'
import { wsEventEmitter, SOCKET_EVENTS } from '../config/ws.js'

export const ORDER_EVENTS = {
    REFUND_REQUESTED: 'order:refund_requested',
    SEND_ORDER_REQUEST_TO_RESTAURANT: 'order:send_order_request_to_restaurant',
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
            wsEventEmitter.emit(ORDER_EVENTS.NEW_ORDER_TRIGGER, { restaurantId, orderId, orderItems })
        })
    }
}

export const orderEventsEmitter = new OrderEventsEmitter()
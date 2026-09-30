import { EventEmitter } from 'events'
import { wsEventEmitter, SOCKET_EVENTS } from '../config/ws.js'

export const RESTAURANT_EVENTS = {
    ORDER_ACCEPTED: 'order:accepted',
    ORDER_REJECTED: 'order:rejected',
    ORDER_PREPARING: 'order:preparing',
}
class RestaurantEventEmitter extends EventEmitter {

    constructor() {
        super()
        this.registerListeners()
    }

    registerListeners() {
        this.on(RESTAURANT_EVENTS.ORDER_ACCEPTED, ({ orderId, userId }) => {
            wsEventEmitter.emit(SOCKET_EVENTS.ORDER_ACCEPTED, { orderId, userId })
        })
        this.on(RESTAURANT_EVENTS.ORDER_REJECTED, ({ orderId, userId }) => {
            wsEventEmitter.emit(SOCKET_EVENTS.ORDER_REJECTED, { orderId, userId })
        })
        this.on(RESTAURANT_EVENTS.ORDER_PREPARING, ({ orderId, userId }) => {
            wsEventEmitter.emit(SOCKET_EVENTS.ORDER_PREPARING, { orderId, userId })
        })
    }
}

export const restaurantEventEmitter = new RestaurantEventEmitter()
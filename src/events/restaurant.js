import { EventEmitter } from 'events'
import { wsEventEmitter, SOCKET_EVENTS } from '../config/ws.js'
import { DeliveryPartner, Order } from '../models/index.js'
import convertDistance from 'convert-units'
import * as constants from '../constants.js'
import { getDistance } from 'geolib'
import ms from 'ms'
import * as utils from '../utils/index.js'

export const RESTAURANT_EVENTS = {
    ORDER_ACCEPTED: 'order:accepted',
    ORDER_REJECTED: 'order:rejected',
    ORDER_PREPARING: 'order:preparing',
    ORDER_READY_FOR_PICKUP: 'order:readyforpickup',
    FIND_DELIVERY_PARTNER: 'order:deliverypartner:find'
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
        this.on(RESTAURANT_EVENTS.ORDER_READY_FOR_PICKUP, ({ orderId, userId, deliveryPartnerId }) => {
            wsEventEmitter.emit(SOCKET_EVENTS.ORDER_READY_FOR_PICKUP, { orderId, userId, deliveryPartnerId })
        })
    }
}

export const restaurantEventEmitter = new RestaurantEventEmitter()
import { EventEmitter } from 'events'

class RestaurantEvents extends EventEmitter {
    sendOrder = ({ orderId, orderItems }) => {

    }
}

export const restaurantEvents = new RestaurantEvents()
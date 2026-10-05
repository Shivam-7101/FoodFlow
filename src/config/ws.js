import { Server } from 'socket.io'
import ms from 'ms'
import * as utils from '../utils/index.js'
import { Session, User, DeliveryPartner, Restaurant } from '../models/index.js'
import { ErrorCodes, ForbiddenError, NotFoundError, UnauthorizedError, InternalServerError, BadRequestError } from '../errors/index.js'
import * as constants from '../constants.js'
import { EventEmitter } from 'events'

export const SOCKET_EVENTS = {
    RESTAURANT_STATUS_OPEN: 'restaurant:status:open',
    RESTAURANT_STATUS_OPEN_ACK: 'restaurant:status:open:ack',
    USER_JOIN: 'user:join:room',
    USER_JOIN_ACK: 'user:join:room:ack',
    DELIVERY_PARTNER_JOIN: 'deliverypartner:join:room',
    DELIVERY_PARTNER_JOIN_ACK: 'deliverypartner:join:room:ack',
    NEW_ORDER: 'restaurant:order:new',
    NEW_ORDER_TRIGGER: 'order:new:trigger',
    DELIVERY_PARTNER_NEW_ORDER: 'restaurant:order:new',
    DELIVERY_PARTNER_NEW_ORDER_TRIGGER: 'order:new:trigger',
    ORDER_ACCEPTED: 'restaurant:order:accepted',
    ORDER_ACCEPTED_ACK: 'order:accepted:ack',
    ORDER_READY_FOR_PICKUP: 'restaurant:order:readyforpickup',
    ORDER_READY_FOR_PICKUP_ACK: 'order:readyforpickup:ack',
    ORDER_REJECTED: 'order:rejected',
    ORDER_REJECTED_ACK: 'order:rejected:ack',
    DELIVERY_PARTNER_ORDER_REJECTED: 'order:rejected',
    ORDER_PICKED_UP: 'order:status:pickedup',
    ORDER_PICKED_UP_ACK: 'order:pickedup:ack',
    ORDER_OUT_FOR_DELIVERY: 'order:status:outfordelivery',
    ORDER_OUT_FOR_DELIVERY_ACK: 'order:outfordelivery:ack',
    ORDER_DELIVERED: 'order:status:delivered',
    ORDER_DELIVERED_ACK: 'order:delivered:ack',
    ORDER_PREPARING: 'restaurant:order:preparing',
    ORDER_PREPARING_ACK: 'order:preparing:ack',
}

const authenticate = async (socket, next) => {

    // console.log('SOCKET', socket)
    // console.log('SOCKET HANDSHAKE', socket.handshake)
    // console.log('SOCKET HANDSHAKE HEADERS', socket.handshake.headers)
    // console.log('SOCKET HEADERS', socket.headers)
    try {
        const accessToken = socket.handshake.headers?.["authorization"]?.split(' ')[1]

        // console.log('ACCESS TOKEN: ', accessToken)
        const payload = utils.tokens.verifyAccessToken(accessToken)
        // console.log('ACCESS TOKEN PAYLOAD: ', payload)
        if (!payload) {
            // console.error('WS ERR: Invalid access token.')
            return next(new UnauthorizedError(ErrorCodes.AUTH.INVALID_ACCESS_TOKEN));
        }

        const session = await Session.findOne({
            _id: payload.sessionId,
            isValid: true
        })
        if (!session) {
            return next(new UnauthorizedError(ErrorCodes.SESSION.SESSION_NOT_FOUND))
        }
        if (session.userId.toString() !== payload.userId.toString()) {
            return next(new UnauthorizedError(ErrorCodes.AUTH.INVALID_ACCESS_TOKEN));
        }

        const user = await User.findById(session.userId)
        if (!user) {
            return next(new UnauthorizedError(ErrorCodes.AUTH.USER_NOT_FOUND))
        }
        if (!user.isActive) {
            return next(new UnauthorizedError(ErrorCodes.AUTH.ACCOUNT_BLOCKED));
        }
        socket.auth = { user, session }
        next()
    } catch (error) {
        const message = error.message || error
        console.error('WS Auth Middleware Crash:', error.message);
        next(new InternalServerError(error));
    }
}

const authorise = async function ([event, args], next) {

    const socket = this
    try {
        switch (event) {
            case SOCKET_EVENTS.RESTAURANT_STATUS_OPEN: {

                if (!args || typeof args !== 'object' || !args.restaurantId) {
                    socket.disconnect(true);
                    return next(new BadRequestError("Missing restaurantId parameter."));
                }

                if (socket.auth.user.role !== constants.USER_ROLE.RESTAURANT_OWNER) {
                    socket.disconnect()
                    return next(new UnauthorizedError(ErrorCodes.ROLE.UNAUTHORIZED_ROLE))
                }

                const restaurantFromCache = await utils.cache.getRestaurant({ restaurantId: args.restaurantId })
                if (!restaurantFromCache.status) {
                    socket.disconnect()
                    return next(new NotFoundError(ErrorCodes.RESTAURANT.RESTAURANT_NOT_FOUND))
                }
                const restaurant = restaurantFromCache.data

                if (!restaurant.isActive) {
                    socket.disconnect()
                    return next(new ForbiddenError(ErrorCodes.RESTAURANT.RESTAURANT_NOT_ACTIVE))
                }
                if (!restaurant.isOpen) {
                    socket.disconnect()
                    return next(new ForbiddenError(ErrorCodes.RESTAURANT.RESTAURANT_CLOSED))
                }

                socket.restaurant = restaurant
                break;
            }
            case SOCKET_EVENTS.DELIVERY_PARTNER_JOIN: {
                if (!args || typeof args !== 'object' || !args.deliveryPartnerId) {
                    socket.disconnect(true)
                    return next(new BadRequestError(`DELIVERY_PARTNER_JOIN_ERR: missing delivery partner id.`))
                }

                const deliveryPartnerData = await utils.cache.getDeliveryPartner({ deliveryPartnerId: args.deliveryPartnerId })

                if (!deliveryPartnerData.status) {
                    socket.disconnect()
                    return next(new NotFoundError(ErrorCodes.DELIVERY.DELIVERY_PARTNER_NOT_FOUND));
                }
                const deliveryPartner = deliveryPartnerData.data

                if (!deliveryPartner) {
                    socket.disconnect()
                    return next(new NotFoundError(ErrorCodes.DELIVERY.DELIVERY_PARTNER_NOT_FOUND));
                }

                if (!deliveryPartner.isActive) {
                    socket.disconnect()
                    return next(new NotFoundError(ErrorCodes.DELIVERY.ACCOUNT_INVACTIVE));
                }

                if (!deliveryPartner.isOnline) {
                    socket.disconnect()
                    return next(new NotFoundError(ErrorCodes.DELIVERY.DELIVERY_PARTNER_OFFLINE));
                }

                socket.deliveryPartner = deliveryPartner
                break;
            }
            default:
                break;
        }

        next()
    } catch (error) {
        console.error("WS Packet Authorisation Failure:", error);
        socket.disconnect(true);
        next(new InternalServerError("Internal validation failure."));
    }
}

const joinRestaurantRoom = async function (args) {

    const socket = this
    await socket.join(`restaurant:${socket.restaurant._id}`)
    socket.emit(SOCKET_EVENTS.RESTAURANT_STATUS_OPEN_ACK, {
        success: true,
        message: `Listening to order stream for ${socket.restaurant.name}`
    })
    // console.log(`Restaurant ${socket.restaurant.name} is now online and listening to its room.`);
}

const joinUserRoom = async function (args) {

    const socket = this
    await socket.join(`user:${socket.auth.user._id}`)
    socket.emit(SOCKET_EVENTS.USER_JOIN_ACK, {
        success: true,
        message: `${socket.auth.user.name} successfully connected to websocket server.`
    })
    // console.log(`user ${socket.auth.user.name} connected to websocket server.`);
}

const joinDeliveryPartnerRoom = async function (args) {

    const socket = this
    // console.log('-----DELIVERY_PARTNER_JOINING_ROOM-----')
    // console.log('DELIVERY_PARTNER_ID_OBJECT: ', socket.deliveryPartner._id)
    // console.log('DELIVERY_PARTNER_ID_STRING: ', socket.deliveryPartner._id.toString())
    // console.log('-----DELIVERY_PARTNER_JOINING_ROOM-----')
    await socket.join(`deliveryPartner:${socket.deliveryPartner._id.toString()}`)
    socket.emit(SOCKET_EVENTS.DELIVERY_PARTNER_JOIN_ACK, {
        success: true,
        message: 'listening for orders to be delivered'
    })
}

let io = null;
export const startWebSocketServer = ({ httpServer }) => {

    io = new Server(httpServer, {
        path: '/ws',
        connectionStateRecovery: {
            maxDisconnectionDuration: ms('1h'),
            skipMiddlewares: false
        },
        pingInterval: ms('25s'),
        pingTimeout: ms('20s')
    });

    io.use(authenticate)


    io.on('connection', (socket) => {
        // console.log(`WS: User connected: ${socket.auth.user.name}`)

        socket.use(authorise.bind(socket))

        socket.on(SOCKET_EVENTS.RESTAURANT_STATUS_OPEN, joinRestaurantRoom.bind(socket))
        socket.on(SOCKET_EVENTS.USER_JOIN, joinUserRoom.bind(socket))
        socket.on(SOCKET_EVENTS.DELIVERY_PARTNER_JOIN, joinDeliveryPartnerRoom.bind(socket))

    })

    io.on('disconnect', (socket) => {
        // console.log(`WS: User disconnected: ${socket.auth.user.name}`)
    })
    io.on('error', (error) => {
        console.error('WS Error:', error);
    })
}

class WsEventEmitter extends EventEmitter {

    constructor() {
        super()
        this.registerListeners()
    }

    registerListeners() {
        this.on(SOCKET_EVENTS.NEW_ORDER_TRIGGER, ({ restaurantId, orderId, orderItems }) => {
            if (!io) {
                console.error('ORDER REQUEST: socket.io server is not initialized yet')
                return;
            }
            io.to(`restaurant:${restaurantId}`).emit(SOCKET_EVENTS.NEW_ORDER, { orderId, orderItems })
        })

        this.on(SOCKET_EVENTS.ORDER_ACCEPTED, ({ orderId, userId }) => {
            if (!io) {
                return;
            }
            io.to(`user:${userId}`).emit(SOCKET_EVENTS.ORDER_ACCEPTED_ACK, { orderId })
        })

        this.on(SOCKET_EVENTS.ORDER_REJECTED, ({ orderId, userId }) => {
            if (!io) {
                return;
            }
            io.to(`user:${userId}`).emit(SOCKET_EVENTS.ORDER_REJECTED_ACK, { orderId })
        })

        this.on(SOCKET_EVENTS.ORDER_PREPARING, ({ orderId, userId }) => {
            if (!io) {
                return;
            }
            io.to(`user:${userId}`).emit(SOCKET_EVENTS.ORDER_PREPARING_ACK, { orderId })
        })

        this.on(SOCKET_EVENTS.ORDER_READY_FOR_PICKUP, ({ orderId, userId, deliveryPartnerId }) => {
            if (!io) {
                return;
            }
            io.to(`user:${userId}`).emit(SOCKET_EVENTS.ORDER_READY_FOR_PICKUP_ACK, { orderId })
            if (deliveryPartnerId) {
                io.to(`deliveryPartner:${deliveryPartnerId}`).emit(SOCKET_EVENTS.ORDER_READY_FOR_PICKUP_ACK, { orderId })
            }
        })

        this.on(SOCKET_EVENTS.DELIVERY_PARTNER_NEW_ORDER, ({ orderId, distance, deliveryPartnerId }) => {
            // console.log('-----------LOGGING IO -----------')
            // console.log('IO: ', io)
            // console.log('-----------LOGGING IO -----------')
            if (!io) {
                return;
            }
            // console.log('-----SENDING_NEW_ORDER_TO_DELIVERY_PARTNER-----')
            // console.log('ORDER_ID: ', orderId?.toString())
            // console.log('DISTANCE: ', distance)
            // console.log('DELIVERY_PARTNER_ID_STRING: ', deliveryPartnerId)
            // console.log('-----SENDING_NEW_ORDER_TO_DELIVERY_PARTNER-----')
            io.to(`deliveryPartner:${deliveryPartnerId}`).emit(SOCKET_EVENTS.DELIVERY_PARTNER_NEW_ORDER_TRIGGER, { orderId, distance })
        })

        this.on(SOCKET_EVENTS.DELIVERY_PARTNER_ORDER_REJECTED, ({ userId, restaurantId, orderId, reason }) => {
            if (!io) {
                return;
            }
            io.to(`restaurant:${restaurantId}`).emit(SOCKET_EVENTS.ORDER_REJECTED_ACK, { orderId, reason })
            io.to(`user:${userId}`).emit(SOCKET_EVENTS.ORDER_REJECTED_ACK, { orderId, reason })
        })

        this.on(SOCKET_EVENTS.ORDER_PICKED_UP, ({ userId, orderId }) => {
            if (!io) {
                return;
            }
            io.to(`user:${userId}`).emit(SOCKET_EVENTS.ORDER_PICKED_UP_ACK, { orderId })
        })

        this.on(SOCKET_EVENTS.ORDER_DELIVERED, ({ userId, orderId }) => {
            if (!io) {
                return;
            }
            io.to(`user:${userId}`).emit(SOCKET_EVENTS.ORDER_DELIVERED_ACK, { orderId })
        })

        this.on(SOCKET_EVENTS.ORDER_OUT_FOR_DELIVERY, ({ userId, orderId }) => {
            if (!io) {
                return;
            }
            io.to(`user:${userId}`).emit(SOCKET_EVENTS.ORDER_OUT_FOR_DELIVERY_ACK, { orderId })
        })
    }
}

export const wsEventEmitter = new WsEventEmitter()
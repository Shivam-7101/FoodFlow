import { Server } from 'socket.io'
import ms from 'ms'
import * as utils from '../utils/index.js'
import { Session, User, DeliveryPartner, Restaurant } from '../models/index.js'
import { ErrorCodes, ForbiddenError, NotFoundError, UnauthorizedError, InternalServerError } from '../errors/index.js'
import * as constants from '../constants.js'
import { EventEmitter } from 'events'

export const SOCKET_EVENTS = {
    RESTAURANT_STATUS_OPEN: 'restaurant:status:open',
    RESTAURANT_STATUS_OPEN_ACK: 'restaurant:status:open:ack',
    NEW_ORDER: 'restaurant:order:new',
    NEW_ORDER_TRIGGER: 'order:new:trigger',
}

const authenticate = async (socket, next) => {

    // console.log('SOCKET', socket)
    // console.log('SOCKET HANDSHAKE', socket.handshake)
    // console.log('SOCKET HANDSHAKE HEADERS', socket.handshake.headers)
    // console.log('SOCKET HEADERS', socket.headers)
    try {
        const accessToken = socket.handshake.headers?.["authorization"]?.split(' ')[1]

        console.log('ACCESS TOKEN: ', accessToken)
        const payload = utils.tokens.verifyAccessToken(accessToken)
        console.log('ACCESS TOKEN PAYLOAD: ', payload)
        if (!payload) {
            console.error('WS ERR: Invalid access token.')
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
            case SOCKET_EVENTS.RESTAURANT_STATUS_OPEN:

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
    console.log(`Restaurant ${socket.restaurant.name} is now online and listening to its room.`);
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
        console.log(`WS: User connected: ${socket.auth.user.name}`)

        socket.use(authorise.bind(socket))

        socket.on(SOCKET_EVENTS.RESTAURANT_STATUS_OPEN, joinRestaurantRoom.bind(socket))

    })

    io.on('disconnect', (socket) => {
        console.log(`WS: User disconnected: ${socket.auth.user.name}`)
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
    }
}

export const wsEventEmitter = new WsEventEmitter()
import { Server } from 'socket.io'
import ms from 'ms'
import * as utils from '../utils/index.js'
import { Session, User, DeliveryPartner } from '../models/index.js'

const isAuthorized = function (packet, next) {
    const [eventName] = packet
    const socket = this
    const userRole = socket.auth?.user?.role

    switch (eventName) {
        case 'deliveryPartner:location:update':
        case 'deliveryPartner:order:accept':
        case 'deliveryPartner:order:complete':
            if (userRole !== 'DELIVERY_PARTNER') return next(new Error("FORBIDDEN ERROR: ROLE MUST BE DELIVERY PARTNER TO PERFORM THESE ACTIONS"));

            break;

        default:
            break;
    }
    next()
};

const authenticate = async (socket, next) => {
    try {
        const incomingAccessToken = socket.handshake.auth.token
        const payload = utils.tokens.verifyAccessToken(incomingAccessToken)
        if (!payload) return next(new Error('NOT AUTHORIZED'));

        // Optimization: Use parallel queries and .lean() for faster lookups
        const [session, user] = await Promise.all([
            Session.findOne({ _id: payload.sessionId, isValid: true }).lean(),
            User.findById(payload.userId).lean()
        ]);

        if (!session) return next(new Error('SESSION IS INVALID OR NOT FOUND'));
        if (session.userId.toString() !== payload.userId.toString()) return next(new Error('INVALID ACCESS TOKEN'));

        if (!user) return next(new Error('ACCOUNT NOT FOUND'));
        if (!user.isActive) return next(new Error('ACCOUNT BLOCKED BY FOODFLOW'));
        if (!user.isVerified) return next(new Error('ACCOUNT NOT VERIFIED'));

        // FIX: Assignments must happen inside the block where 'user' and 'payload' exist
        socket.auth = {
            user,
            deliveryPartnerId: socket.handshake.auth?.deliveryPartnerId || null
        }
        socket.tokenExpiry = payload.exp

        next()
    } catch (error) {
        return next(new Error(`SOMETHING WENT WRONG: ${error.message || error}`))
    }
}

const connectClientToSocketIoServer = async (socket, next) => {
    try {
        switch (socket.auth?.user?.role) {
            case 'DELIVERY_PARTNER':
                if (!socket.auth.deliveryPartnerId) return next(new Error('DELIVERY PARTNER ID NOT FOUND'));

                const deliveryPartner = await DeliveryPartner.findByIdAndUpdate(
                    socket.auth.deliveryPartnerId,
                    { $set: { isOnline: true } },
                    { returnDocument: 'after' }
                )

                if (!deliveryPartner) {
                    const isDeliveryPartnerExists = await DeliveryPartner.findById(socket.auth.deliveryPartnerId)
                    if (!isDeliveryPartnerExists) return next(new Error('DELIVERY PARTNER ACCOUNT NOT FOUND'));
                    if (!isDeliveryPartnerExists.isOnline) return next(new Error("SOMETHING WENT WRONG: CAN'T UPDATE ONLINE STATUS OF DELIVERY PARTNER"));
                }
                break;

            default:
                break;
        }
        next()
    } catch (error) {
        return next(new Error(`SERVER ERROR IN CONNECTION MIDDLEWARE: ${error.message}`));
    }
}

export const startWebSocketServer = ({ httpServer }) => {
    const io = new Server(httpServer, {
        path: '/ws',
        pingInterval: ms('1m'),
        pingTimeout: ms('3m'),
        connectionStateRecovery: {
            skipMiddlewares: false,
            maxDisconnectionDuration: ms('5m')
        }
    })

    io.use(authenticate)
    io.use(connectClientToSocketIoServer)

    io.on('connection', (socket) => {
        console.log(`${socket.auth.user.name} connected.`)

        socket.use(isAuthorized.bind(socket))

        socket.on('error', (err) => {
            socket.emit('socket:error', { message: err.message });
        });
    })
}
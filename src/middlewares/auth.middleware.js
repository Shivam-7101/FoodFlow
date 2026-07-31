import * as utils from '../utils/index.js'
import { ErrorCodes, UnauthorizedError } from '../errors/index.js'
import { User, Session } from '../models/index.js'

export const authenticate = utils.asyncHandler(async (req, res, next) => {

    const authHeader = req.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) throw new UnauthorizedError(ErrorCodes.AUTH.INVALID_ACCESS_TOKEN);
    const incomingAccessToken = authHeader?.split(' ')?.[1]
    if (!incomingAccessToken) throw new UnauthorizedError(ErrorCodes.AUTH.INVALID_ACCESS_TOKEN);
    const payload = utils.tokens.verifyAccessToken(incomingAccessToken)
    if (!payload) throw new UnauthorizedError(ErrorCodes.AUTH.INVALID_ACCESS_TOKEN);

    const session = await Session.findOne({
        _id: payload.sessionId,
        isValid: true
    })
    if (!session) throw new UnauthorizedError(ErrorCodes.SESSION.SESSION_NOT_FOUND);
    if (session.userId.toString() !== payload.userId.toString()) throw new UnauthorizedError(ErrorCodes.AUTH.INVALID_REFRESH_TOKEN);

    const user = await User.findById(session.userId)
    if (!user) throw new UnauthorizedError(ErrorCodes.AUTH.USER_NOT_FOUND);
    if (!user.isActive) throw new UnauthorizedError(ErrorCodes.AUTH.ACCOUNT_BLOCKED);

    req.auth = { user, session }
    next()
})
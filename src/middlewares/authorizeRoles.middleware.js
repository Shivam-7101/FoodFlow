import * as utils from '../utils/index.js'
import { ErrorCodes, UnauthorizedError } from '../errors/index.js'

export const authorizeRoles = (...allowedRoles) => {
    return utils.asyncHandler(async (req, res, next) => {

        if (!allowedRoles.includes(req.auth.user.role)) throw new UnauthorizedError(ErrorCodes.AUTH.UNAUTHORIZED_ROLE);

        next()
    })
}
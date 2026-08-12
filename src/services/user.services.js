import * as utils from '../utils/index.js'
import { ErrorCodes, NotFoundError, ValidationError, BadRequestError } from '../errors/index.js'
import { User } from '../models/index.js'
import * as mapper from '../mapper/index.js'

export const getUser = async ({ userId }) => {

    const user = await User.findById(userId)
    if (!user) throw new NotFoundError(ErrorCodes.AUTH.USER_NOT_FOUND);
    return mapper.userMapper(user)
}
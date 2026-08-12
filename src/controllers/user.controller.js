import * as utils from '../utils/index.js'
import * as userServices from '../services/user.services.js'

export const getUser = utils.asyncHandler(async (req, res) => {

    const user = await userServices.getUser({ userId: req.auth.user._id })

    res.status(200).json(new utils.ApiResponse(200, { user }, 'user details fetched successfully.'));
})
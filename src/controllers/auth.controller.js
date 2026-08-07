import * as utils from '../utils/index.js'
import * as authServices from '../services/auth.service.js'
import * as constants from '../constants.js'

export const signup = utils.asyncHandler(async (req, res) => {

    const user = await authServices.signup({ body: req.body })

    res.status(201).json(new utils.ApiResponse(201, user, 'Account created successfully'))
})

export const login = utils.asyncHandler(async (req, res) => {

    const { user, accessToken, refreshToken } = await authServices.login({ body: req.body, userAgent: req.get('User-Agent'), ipAddress: req.ip || req.get('X-Forwarded-For') || req.socket.remoteAddress })

    res.status(200).cookie('refreshToken', refreshToken, constants.COOKIE_OPTIONS).json(new utils.ApiResponse(200, { user, accessToken }, 'login successfull'))
})

export const rotateRefreshToken = utils.asyncHandler(async (req, res) => {

    const oldRefreshToken = req.cookies.refreshToken
    const { user, accessToken, refreshToken } = await authServices.rotateRefreshToken({ oldRefreshToken })

    res.status(200).cookie('refreshToken', refreshToken, constants.COOKIE_OPTIONS).json(new utils.ApiResponse(200, { user, accessToken }, 'refresh token refreshed'))
})

export const logout = utils.asyncHandler(async (req, res) => {

    await authServices.logout({ deviceId: req.body.deviceId, userId: req.auth.user._id, sessionId: req.auth.session._id })

    res.status(200).clearCookie('refreshToken', constants.COOKIE_OPTIONS).json(new utils.ApiResponse(200, {}, 'logout successfully.'))
})

export const logoutFromAllDevices = utils.asyncHandler(async (req, res) => {

    await authServices.logoutFromAllDevices({ userId: req.auth.user._id, sessionId: req.auth.session._id })

    res.status(200).clearCookie('refreshToken', constants.COOKIE_OPTIONS).json(new utils.ApiResponse(200, {}, 'logout from all devices successfully.'))
})

export const verifyEmailRequest = utils.asyncHandler(async (req, res) => {

    await authServices.verifyEmailRequest({ userId: req.auth.user._id, email: req.auth.user.email })

    res.status(200).json(new utils.ApiResponse(200, {}, 'check your inbox or spam for otp.'))
})

export const verifyEmailVerificationOtp = utils.asyncHandler(async (req, res) => {

    await authServices.verifyEmailVerificationOtp({ userId: req.auth.user._id, otp: req.body.otp })

    res.status(200).json(new utils.ApiResponse(200, {}, 'email has been verified successfully.'))
})

export const changePassword = utils.asyncHandler(async (req, res) => {

    console.log(`OLD PASSWORD: ${req.body.oldPassword}`)
    console.log(`NEW PASSWORD: ${req.body.newPassword}`)
    await authServices.changePassword({ oldPassword: req.body.oldPassword, newPassword: req.body.newPassword, userId: req.auth.user._id })

    res.status(200).json(new utils.ApiResponse(200, {}, 'password changed successfully.'))
})
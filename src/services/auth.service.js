import { BadRequestError, ConflictError, ErrorCodes, InternalServerError, NotFoundError, UnauthorizedError, ValidationError } from '../errors/index.js'
import { User, Session } from '../models/index.js'
import * as authValidation from '../validators/authValidation.js'
import { userMapper } from '../mapper/user.mapper.js'
import * as utils from '../utils/index.js'
import { UAParser } from 'ua-parser-js'
import ms from 'ms'
import mongoose from 'mongoose'
import * as queue from '../queues/index.js'

export const signup = async ({ body }) => {

    const result = authValidation.signup.safeParse(body)
    if (!result.success) throw new ValidationError(ErrorCodes.VALIDATION.INVALID_INPUT);

    const data = result.data
    const userExists = await User.findOne({ email: data.email })
    if (userExists) throw new ConflictError(ErrorCodes.AUTH.ACCOUNT_ALREADY_EXISTS);

    const user = await User.create({
        name: data.name,
        email: data.email,
        password: data.password,
        phone: data.phone,
    })

    return userMapper(user)
}

export const login = async ({ body, userAgent, ipAddress }) => {

    const result = authValidation.login.safeParse(body)
    if (!result.success) throw new ValidationError(ErrorCodes.VALIDATION.INVALID_INPUT);

    const data = result.data
    const user = await User.findOne({ email: data.email }).select('+password')
    if (!user) throw new UnauthorizedError(ErrorCodes.AUTH.INVALID_CREDENTIALS);
    if (! await user.isPasswordCorrect(data.password)) throw new UnauthorizedError(ErrorCodes.AUTH.INVALID_CREDENTIALS);
    if (!user.isActive) throw new BadRequestError(ErrorCodes.AUTH.ACCOUNT_BLOCKED);

    const parser = new UAParser(userAgent)
    let deviceString = 'Unknown device'
    const browser = parser.getBrowser()
    const device = parser.getDevice()
    const os = parser.getOS()
    if (browser.name && os.name) {
        deviceString = `${browser.name} on ${os.name}`;
    }
    if (device.type === 'mobile' || device.type === 'tablet') {
        deviceString = `${browser.name} on ${os.name} (${device.model || 'Mobile'})`;
    }

    let refreshToken, accessToken

    const mongooseSession = await mongoose.startSession();
    try {
        await mongooseSession.withTransaction(async () => {

            await Session.findOneAndUpdate(
                {
                    userId: user._id,
                    deviceId: data.deviceId,
                    isValid: true
                },
                {
                    hashedRefreshToken: null,
                    isValid: false,
                    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
                },
                {
                    session: mongooseSession
                }
            )

            // const newSessionId = new mongoose.Types.ObjectId()

            const session = new Session({
                userId: user._id,
                isValid: true,
                deviceId: data.deviceId,
                userAgent: deviceString,
                ipAddress: ipAddress,
                expiresAt: new Date(Date.now() + ms(process.env.JWT_REFRESH_TOKEN_EXPIRY))
            })
            accessToken = utils.tokens.generateAccessToken({ userId: user._id, sessionId: session._id })
            refreshToken = utils.tokens.generateRefreshToken({ userId: user._id, sessionId: session._id })

            session.hashedRefreshToken = refreshToken
            await session.save({ session: mongooseSession })
        })
    } finally {
        await mongooseSession.endSession()
    }

    const userData = userMapper(user)

    return { user: userData, accessToken, refreshToken }
}

export const rotateRefreshToken = async ({ oldRefreshToken }) => {

    if (!oldRefreshToken || !oldRefreshToken?.trim()) throw new UnauthorizedError(ErrorCodes.AUTH.INVALID_REFRESH_TOKEN);
    const payload = utils.tokens.verifyRefreshToken(oldRefreshToken)
    if (!payload) throw new UnauthorizedError(ErrorCodes.AUTH.INVALID_REFRESH_TOKEN);

    const session = await Session.findById(payload.sessionId)
    if (!session) throw new UnauthorizedError(ErrorCodes.SESSION.SESSION_NOT_FOUND);
    const userPromise = User.findById(session.userId)
    if (session.userId.toString() !== payload.userId.toString()) throw new UnauthorizedError(ErrorCodes.AUTH.INVALID_REFRESH_TOKEN);
    if (!session.isValid) throw new UnauthorizedError(ErrorCodes.SESSION.SESSION_INVALID);
    if (!(await session.isHashedRefreshTokenCorrect(oldRefreshToken))) {

        session.isValid = false;
        session.hashedRefreshToken = null;
        await session.save();

        throw new UnauthorizedError(ErrorCodes.AUTH.INVALID_REFRESH_TOKEN);
    }

    const user = await userPromise
    if (!user) throw new UnauthorizedError(ErrorCodes.AUTH.USER_NOT_FOUND);
    if (!user.isActive) throw new UnauthorizedError(ErrorCodes.AUTH.ACCOUNT_BLOCKED);

    const accessToken = utils.tokens.generateAccessToken({ userId: user._id.toString(), sessionId: session._id.toString() })
    const refreshToken = utils.tokens.generateRefreshToken({ userId: user._id.toString(), sessionId: session._id.toString() })

    session.hashedRefreshToken = refreshToken
    session.expiresAt = new Date(Date.now() + ms(process.env.JWT_REFRESH_TOKEN_EXPIRY))
    await session.save()

    return { user: userMapper(user), accessToken, refreshToken }
}

export const logout = async ({ deviceId, userId, sessionId }) => {

    const isLogedout = await Session.findOneAndUpdate(
        {
            _id: sessionId,
            userId: userId,
            isValid: true,
            deviceId: deviceId
        },
        {
            $set: {
                isValid: false,
                hashedRefreshToken: null
            }
        },
        { returnDocument: 'after' }
    )
}

export const logoutFromAllDevices = async ({ userId, sessionId }) => {

    await Session.updateMany(
        {
            _id: sessionId,
            userId: userId,
            isValid: true
        },
        {
            $set: {
                isValid: false,
                hashedRefreshToken: null
            }
        }
    )
}

export const verifyEmailRequest = async ({ userId, email }) => {

    try {
        // console.log('1. EMAIL VERIFICATION REQUEST COMES')
        await queue.emailQueue.add('email-verification', { to: email, userId: userId, subject: 'FOOD FLOW: verify your email.' })
        // console.log('9. EMAIL SENT TO USER')

        return
    } catch (error) {
        throw new InternalServerError(`EMAIL QUEUE ERR: Failed to add email to queue`)
    }
}

export const verifyEmailVerificationOtp = async ({ userId, otp }) => {

    if (!otp?.trim()) throw new BadRequestError(ErrorCodes.VERIFICATION.INVALID_OTP);

    const storedOtp = await utils.redis.getString({ prefix: 'otp', id: userId })
    if (!storedOtp) throw new BadRequestError(ErrorCodes.VERIFICATION.OTP_EXPIRED);
    if (storedOtp !== otp.toString()) throw new BadRequestError(ErrorCodes.VERIFICATION.INVALID_OTP);
    // await utils.redis.deleteStringKey({ prefix: 'otp', id: userId })

    const user = await User.findOneAndUpdate(
        {
            _id: userId,
            isVerified: false
        },
        {
            $set: {
                isVerified: true
            }
        },
        {
            returnDocument: "after"
        }
    )
    if (!user) {
        const existingUser = await User.findById(userId)
        if (existingUser?.isVerified) {
            return
        }
        throw new BadRequestError(ErrorCodes.VERIFICATION.INVALID_OTP)
    }
}
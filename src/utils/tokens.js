import jwt from 'jsonwebtoken'

export const generateAccessToken = (payload) => {
    return jwt.sign(
        payload,
        process.env.JWT_ACCESS_TOKEN_SECRET,
        { expiresIn: process.env.JWT_ACCESS_TOKEN_EXPIRY }
    )
}

export const generateRefreshToken = (payload) => {
    return jwt.sign(
        payload,
        process.env.JWT_REFRESH_TOKEN_SECRET,
        { expiresIn: process.env.JWT_REFRESH_TOKEN_EXPIRY }
    )
}

export const verifyAccessToken = (accessToken) => {
    return jwt.verify(accessToken, process.env.JWT_ACCESS_TOKEN_SECRET)
}

export const verifyRefreshToken = (refreshToken) => {
    return jwt.verify(refreshToken, process.env.JWT_REFRESH_TOKEN_SECRET)
}
import mongoose from 'mongoose'
import bcrypt from 'bcrypt'

const sessionSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        hashedRefreshToken: {
            type: String,
        },
        isValid: {
            type: Boolean,
            required: true,
            default: true
        },
        deviceId: {
            type: String,
            required: true,
            trim: true
        },
        userAgent: {
            type: String,
            required: true,
            trim: true
        },
        ipAddress: {
            type: String,
            required: true,
            trim: true
        },
        expiresAt: {
            type: Date,
            required: true,
            expires: 0
        }
    },
    {
        timestamps: true
    }
)

sessionSchema.index({ userId: 1, deviceId: 1 }, { unique: true, partialFilterExpression: { isValid: true } })

sessionSchema.pre('save', async function () {

    if (!this.hashedRefreshToken) return;
    if (!this.isModified('hashedRefreshToken')) return;

    this.hashedRefreshToken = await bcrypt.hash(this.hashedRefreshToken, 10)
})

sessionSchema.methods.isHashedRefreshTokenCorrect = async function (refreshToken) {
    // console.log(refreshToken)
    return await bcrypt.compare(refreshToken, this.hashedRefreshToken)
}

export const Session = mongoose.model('Session', sessionSchema)
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
            required: true
        },
        isValid: {
            type: Boolean,
            required: true,
            default: true
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

sessionSchema.index({ userId: 1, isValid: 1 })

sessionSchema.pre('save', async function () {

    if (!this.isModified('hashedRefreshToken')) return;

    this.hashedRefreshToken = await bcrypt.hash(this.hashedRefreshToken, 10)
})

sessionSchema.methods.isHashedRefreshTokenCorrect = function (refreshToken) {
    return bcrypt.compare(refreshToken, this.hashedRefreshToken)
}

export const Session = mongoose.model('Session', sessionSchema)
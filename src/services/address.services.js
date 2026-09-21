import { Address } from '../models/index.js'
import * as mapper from '../mapper/index.js'
import * as utils from '../utils/index.js'
import { ErrorCodes, NotFoundError, ValidationError } from '../errors/index.js'
import * as addressValidation from '../validators/addressValidation.js'
import mongoose from 'mongoose'
import ms from 'ms'

export const createAddress = async ({ user, body }) => {

    body.coordinates = JSON.parse(body?.coordinates)
    const result = addressValidation.address.safeParse(body)
    if (!result.success) throw new ValidationError(`ADDRESS ERR: ${result.error.issues.map(issue => issue.message).join(', ')}`);

    const address = await Address.findOneAndUpdate(
        {
            userId: user._id,
            addressLine1: result.data.addressLine1,
            city: result.data.city,
            state: result.data.state
        },
        {
            fullName: result.data.fullName,
            phone: result.data.phone,
            addressLine2: result.data?.addressLine2 ?? "",
            country: result.data.country,
            postalCode: result.data.postalCode,
            location: { coordinates: result.data.coordinates },
            expiresAt: new Date(Date.now() + ms('48h'))
        },
        {
            returnDocument: 'after',
            setDefaultsOnInsert: true,
            runValidators: true,
            upsert: true
        }
    )

    return mapper.addressMapper({ address })
}

export const setAddressAsDefault = async ({ user, addressId }) => {

    const session = await mongoose.startSession()

    try {
        const address = await session.withTransaction(async () => {
            await Address.updateMany(
                { userId: user._id, isDefault: true },
                { $set: { isDefault: false, expiresAt: new Date(Date.now() + ms('48h')) } },
                { session }
            )
            return await Address.findOneAndUpdate(
                { userId: user._id, _id: new mongoose.Types.ObjectId(addressId) },
                { $set: { isDefault: true, expiresAt: null } },
                { session, returnDocument: 'after' }
            )
        })
        await utils.cache.invalidateAddress({ addressId: '*', userId: user._id })
        return mapper.addressMapper({ address })
    } finally {
        await session.endSession()
    }
}

export const getAddress = async ({ user }) => {
    const address = await utils.cache.getAddress({ userId: user._id })

    if (!address.status) throw new NotFoundError(ErrorCodes.ADDRESS.ADDRESS_NOT_FOUND);
    return mapper.addressMapper({ address: address.data })
}
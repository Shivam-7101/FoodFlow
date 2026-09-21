export const addressMapper = ({ address }) => {
    return {
        _id: address._id,
        userId: address.userId,
        fullName: address.fullName,
        phone: address.phone,
        addressLine1: address.addressLine1,
        addressLine2: address.addressLine2,
        city: address.city,
        state: address.state,
        country: address.country,
        postalCode: address.postalCode,
        isDefault: address.isDefault,
        location: address.location
    }
}
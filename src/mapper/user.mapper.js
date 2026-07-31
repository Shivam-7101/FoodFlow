export const userMapper = (user) => {
    return {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        isVerified: user.isVerified,
        role: user.role,
        createdAt: user.createdAt
    }
}
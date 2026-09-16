export const cartMapper = ({ cart }) => {
    return {
        _id: cart._id,
        userId: cart.userId,
        restaurantId: cart.restaurantId,
        items: cart.items
    }
}
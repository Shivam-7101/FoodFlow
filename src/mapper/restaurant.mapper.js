export const restaurantMapper = (restaurantDocument) => {

    return {
        name: restaurantDocument.name,
        description: restaurantDocument.description,
        address: restaurantDocument.address,
        openingHours: restaurantDocument.openingHours,
        logo: restaurantDocument.logo,
        banner: restaurantDocument.banner,
        minimumOrderAmount: restaurantDocument.minimumOrderAmount,
        deliveryFee: restaurantDocument.deliveryFee,
        ownerId: restaurantDocument.userId,
        isOpen: restaurantDocument.isOpen,
        isActive: restaurantDocument.isActive,
        _id: restaurantDocument._id,
        rating: restaurantDocument.rating,
        status: restaurantDocument.status,
        totalRatings: restaurantDocument.totalRatings
    }
}
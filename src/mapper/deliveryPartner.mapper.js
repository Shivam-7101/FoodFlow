export const deliveryPartnerMapper = (deliveryPartner) => ({
    _id:deliveryPartner._id,
    userId: deliveryPartner.userId,
    vehicleType: deliveryPartner.vehicleType,
    vehicleNumber: deliveryPartner.vehicleNumber,
    isOnline: deliveryPartner.isOnline,
    isActive: deliveryPartner.isActive,
    currentLocation: deliveryPartner.currentLocation,
    documents: deliveryPartner.documents,
    earnings: deliveryPartner.earnings,
    status: deliveryPartner.status,
    rating: deliveryPartner.rating,
    currentStatus: deliveryPartner.currentStatus,
    createdAt: deliveryPartner.createdAt
})
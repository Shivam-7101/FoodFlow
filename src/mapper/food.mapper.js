export const foodMapper = (food) => ({
    name: food.name,
    description: food.description,
    category: food.category,
    isVeg: food.isVeg,
    isAvailable: food.isAvailable,
    images: food.uploadedImages,
    restaurantId: food.restaurantId,
    isActive: food.isActive
})
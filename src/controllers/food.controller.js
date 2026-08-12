import * as utils from '../utils/index.js'
import * as foodServices from '../services/food.services.js'
import * as constants from '../constants.js'

const PORT = process.env.PORT || 5000


export const createFood = utils.asyncHandler(async (req, res) => {

    //  console.log("RAW DATA:", req.body.variants);
    const food = await foodServices.createFood({ restaurantId: req.params.restaurantId, foodBody: req.body, files: req?.files || [] })

    res.status(201).json(new utils.ApiResponse(201, { foodDetails: food }, 'food created successfully.'))
})

export const updateFood = utils.asyncHandler(async (req, res) => {

    const { food, variants } = await foodServices.updateFood({ restaurantId: req.params.restaurantId, foodId: req.params.foodId, foodBody: req.body, files: req.files || [] })

    res.status(200).json(new utils.ApiResponse(200, { food, variants }, 'Food details updated successfully.'))
})

export const deleteFood = utils.asyncHandler(async (req, res) => {

    await foodServices.deleteFood({ foodId: req.params.foodId })

    res.status(200).json(new utils.ApiResponse(200, {}, 'food deleted successfully.'))
})

export const getFoodDetails = utils.asyncHandler(async (req, res) => {

    const food = await foodServices.getFoodDetails({ foodId: req.params.foodId, })

    res.status(200).json(new utils.ApiResponse(200, food, 'food details fetched successfully.'))
})

export const getFoods = utils.asyncHandler(async (req, res) => {
    const { name, category, minAmount, isVeg, maxAmount } = req.query;

    // 1. Safe parsing of inputs
    const page = Number(req.query.page) && Number(req.query.page) > 0 ? Number(req.query.page) : 1;
    const limit = Number(req.query.limit) && Number(req.query.limit) > 0 ? Number(req.query.limit) : 10;
    const sort = req.query.sort?.trim() || 'lowToHigh';

    const pipeline = [];

    // 2. Safe URL generator
    const buildPageLink = (targetPage) => {
        const params = new URLSearchParams();
        params.append('page', targetPage);
        params.append('limit', limit);

        if (name?.trim()) params.append('name', name.trim());
        if (category?.trim()) params.append('category', category.trim());
        if (minAmount?.trim() && !isNaN(minAmount.trim())) params.append('minAmount', minAmount.trim());
        if (maxAmount?.trim() && !isNaN(maxAmount.trim())) params.append('maxAmount', maxAmount.trim());
        if (isVeg?.trim() === 'true' || isVeg?.trim() === 'false') params.append('isVeg', isVeg.trim());
        params.append('sort', sort);

        return `/?${params.toString()}`;
    };

    // 3. Build Filters
    const filter = { isActive: true }; // Always check if active
    if (name?.trim()) {
        filter.$text = { $search: name.trim() };
    }
    if (category?.trim() && constants.FOOD_CATEGORY.includes(category.trim())) {
        filter.category = category.trim();
    }
    if (isVeg?.trim() === 'true' || isVeg?.trim() === 'false') {
        filter.isVeg = isVeg.trim() === 'true';
    }
    if (minAmount?.trim() && !isNaN(minAmount.trim())) {
        filter['priceSummary.minPrice'] = { $gte: Number(minAmount) };
    }
    if (maxAmount?.trim() && !isNaN(maxAmount.trim())) {
        filter['priceSummary.maxPrice'] = { $lte: Number(maxAmount) };
    }

    // Apply the core filter immediately
    pipeline.push({ $match: filter });

    // 4. Handle Sorting before Pagination
    if (sort === 'lowToHigh' || sort === 'highToLow') {
        const sortField = sort === 'lowToHigh' ? 'priceSummary.minPrice' : 'priceSummary.maxPrice';
        pipeline.push({
            $sort: { [sortField]: sort === 'lowToHigh' ? 1 : -1 }
        });
    }

    // 5. Use $facet to fetch count and limited data records simultaneously
    const skip = (page - 1) * limit;
    pipeline.push({
        $facet: {
            metadata: [{ $count: 'totalDocuments' }],
            records: [
                { $skip: skip },
                { $limit: limit },
                {
                    $lookup: {
                        from: 'foodvariants',
                        let: { foodId: '$_id' },
                        pipeline: [
                            {
                                $match: {
                                    $expr: { $eq: ['$foodId', '$$foodId'] },
                                    isActive: true
                                }
                            },
                            {
                                $project: {
                                    _id: 0,
                                    name: 1,
                                    attributes: 1,
                                    price: 1,
                                    stock: 1
                                }
                            }
                        ],
                        as: 'variants'
                    }
                }
            ]
        }
    });

    // Run the aggregate query against database
    const rawResult = await foodServices.getFoods({ pipeline });

    // Extract calculated metrics safely from the $facet output structures
    const totalDocuments = rawResult[0]?.metadata[0]?.totalDocuments || 0;
    const data = rawResult[0]?.records || [];
    const totalPages = Math.ceil(totalDocuments / limit);

    // 6. Build cleanly formatted response object
    const responsePayload = {
        totalDocuments,
        totalPages,
        page,
        limit,
        prevPage: page > 1 ? buildPageLink(page - 1) : null,
        nextPage: page < totalPages ? buildPageLink(page + 1) : null,
        data
    };

    res.status(200).json(new utils.ApiResponse(200, responsePayload, 'foods fetched successfully.'));
});
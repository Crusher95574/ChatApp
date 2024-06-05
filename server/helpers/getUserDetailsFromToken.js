const jwt = require('jsonwebtoken');
const UserModel = require('../models/userModel');
const client = require('../redis/redis');

const getUserDetailsFromToken = async (token) => {
    if (!token) {
        return {
            message: "Session expires",
            logout: true,
        };
    }

    const decode = await jwt.verify(token, process.env.JWT_SECREAT_KEY);
    const cacheKey = `user-details:${decode.id}`;

    // Check if user details exist in the cache
    const cachedUserDetails = await client.get(cacheKey);

    if (cachedUserDetails) {
        // If user details exist, parse them from the cache
        return JSON.parse(cachedUserDetails);
    }

    // If user details don't exist in the cache, fetch them from the database
    const user = await UserModel.findById(decode.id);
    if (!user) {
        return {
            message: "User not found",
            logout: true,
        };
    }

    // Convert user document to a plain object
    const userDetails = user.toObject();

    // Store user details in the cache as a string
    await client.set(cacheKey, JSON.stringify(userDetails), 'EX', 86400); // 1 day expiration

    return userDetails;
};

module.exports = getUserDetailsFromToken;

const getUserDetailsFromToken = require("../helpers/getUserDetailsFromToken");
const UserModel = require("../models/userModel");
const client = require('../redis/redis');

async function updateUserDetails(req, res) {
    try {
        const token = req.cookies.token || "";

        const user = await getUserDetailsFromToken(token);

        if (!user || user.logout) {
            return res.status(401).json({
                message: "Unauthorized",
                error: true
            });
        }

        const { name, profilePic } = req.body;

        await UserModel.updateOne({ _id: user._id }, { name, profilePic });

        const updatedUser = await UserModel.findById(user._id);
        if (!updatedUser) {
            return res.status(404).json({
                message: "User not found after update",
                error: true,
            });
        }

        // Convert user document to a plain object
        const userDetails = updatedUser.toObject();

        const cacheKey = `user-details:${user._id}`;

        // Update user details in the cache as a string
        await client.set(cacheKey, JSON.stringify(userDetails), 'EX', 86400); // 1 day expiration

        return res.json({
            message: "User updated successfully",
            data: userDetails,
            success: true
        });

    } catch (error) {
        return res.status(500).json({
            message: error.message || error,
            error: true
        });
    }
}

module.exports = updateUserDetails;

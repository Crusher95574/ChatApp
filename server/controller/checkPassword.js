const UserModel = require("../models/userModel");
const bcryptjs = require('bcryptjs');
const jwt = require('jsonwebtoken');
const client = require('../redis/redis');

async function checkPassword(req, res) {
    try {
        const { userId, password } = req.body;

        const cacheKey = `user-details:${userId}`;
        let user;

        // Check if user details exist in the cache
        const cachedUserDetails = await client.get(cacheKey);

        if (cachedUserDetails) {
            // If user details exist, parse them from the cache
            user = JSON.parse(cachedUserDetails);
        } else {
            // If user details don't exist in the cache, fetch them from the database
            user = await UserModel.findById(userId);
            if (!user) {
                return res.status(400).json({
                    message: "User not found",
                    error: true,
                });
            }

            // Convert user document to a plain object
            const userDetails = user.toObject();

            // Store user details in the cache as a string
            await client.set(cacheKey, JSON.stringify(userDetails), 'EX', 86400); // 1 day expiration
        }

        // Verify the password
        const verifyPassword = await bcryptjs.compare(password, user.password);

        if (!verifyPassword) {
            return res.status(400).json({
                message: "Wrong password",
                error: true,
            });
        }

        const tokenData = {
            id: user._id,
            email: user.email,
        };

        if (!process.env.JWT_SECREAT_KEY) {
            throw new Error("JWT_SECREAT_KEY is not defined");
        }

        const token = await jwt.sign(tokenData, process.env.JWT_SECREAT_KEY, { expiresIn: '1d' });

        const cookieOptions = {
            httpOnly: true,
            secure: true,
        };

        return res.cookie('token', token, cookieOptions).status(200).json({
            message: "Login successfully",
            token: token,
            success: true,
        });

    } catch (error) {
        console.error("Error in checkPassword function:", error); // Log the error stack trace
        return res.status(500).json({
            message: error.message || "Internal Server Error",
            error: true,
        });
    }
}

module.exports = checkPassword;

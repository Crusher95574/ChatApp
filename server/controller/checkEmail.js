const UserModel = require("../models/userModel");
const client = require('../redis/redis');

async function checkEmail(req, res) {
    try {
        let { email } = req.body;

        // Convert email to lowercase
        email = email.toLowerCase();


        // Check if email exists in Redis cache
        const cachedUserDetails = await client.get(`email:${email}`);
        if (cachedUserDetails) {
            const userData = JSON.parse(cachedUserDetails);
            return res.status(200).json({
                message: "Email verified (from cache)",
                success: true,
                data: userData
            });
        }

        // If email does not exist in cache, query the database
        const user = await UserModel.findOne({ email });

        if (!user) {
            return res.status(400).json({
                message: "User not exists",
                error: true
            });
        }

        // Cache the user details in Redis
        await client.set(`email:${email}`, JSON.stringify(user));

        return res.status(200).json({
            message: "Email verified",
            success: true,
            data: user
        });
    } catch (error) {
        return res.status(500).json({
            message: error.message || error,
            error: true
        });
    }
}

module.exports = checkEmail;

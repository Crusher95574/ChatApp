const UserModel = require("../models/userModel");

async function getAllUsers(req, res) {
    try {
        const users = await UserModel.find({}, '_id name email profilePic');
        return res.status(200).json({
            message: "Users fetched successfully",
            data: users,
            success: true
        });
    } catch (error) {
        return res.status(500).json({
            message: error.message || error,
            error: true
        });
    }
}

module.exports = getAllUsers

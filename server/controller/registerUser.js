const UserModel = require("../models/userModel");
const bcryptjs = require('bcryptjs');

async function registerUser(req, res) {
    try {
        let { name, email, password, profilePic } = req.body;

        // Convert email to lowercase
        email = email.toLowerCase();

        const checkEmail = await UserModel.findOne({ email });

        if (checkEmail) {
            return res.status(400).json({
                message: "User already exists",
                error: true,
            });
        }

        const salt = await bcryptjs.genSalt(10);
        const hashPassword = await bcryptjs.hash(password, salt);

        const payload = {
            name,
            email,
            profilePic,
            password: hashPassword
        };

        const user = new UserModel(payload);
        const userSave = await user.save();

        return res.status(201).json({
            message: "User created successfully",
            data: userSave,
            success: true
        });

    } catch (error) {
        return res.status(500).json({
            message: error.message || error,
            error: true
        });
    }
}

module.exports = registerUser;

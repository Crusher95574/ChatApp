const getUserDetailsFromToken = require("../helpers/getUserDetailsFromToken")
const UserModel = require("../models/userModel")
const bcryptjs = require('bcryptjs')

async function updatePassword(req, res) {
    try {
        const { userId, password } = req.body
        const user = await UserModel.findById(userId)
        const salt = await bcryptjs.genSalt(10)
        const hashpassword = await bcryptjs.hash(password, salt)
        
        const updateUser = await UserModel.updateOne({ _id: userId }, {
            password:hashpassword
        })

        const userInfomation = await UserModel.findById(userId)

        return res.json({
            message: "Password update successfully",
            data: userInfomation,
            success: true
        })


    } catch (error) {
        return res.status(500).json({
            message: error.message || error,
            error: true
        })
    }
}

module.exports = updatePassword
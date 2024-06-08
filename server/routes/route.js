const express = require('express')
const registerUser = require('../controller/registerUser')
const checkEmail = require('../controller/checkEmail')
const checkPassword = require('../controller/checkPassword')
const userDetails = require('../controller/userDetails')
const logout = require('../controller/logout')
const updateUserDetails = require('../controller/updateUserDetails')
const updatePassword = require('../controller/updatePassword')
const searchUser = require('../controller/searchUser')
const getAllUsers = require('../controller/getAllUsers')

const router = express.Router()

router.post('/register', registerUser)

router.post('/email', checkEmail)

router.post('/password', checkPassword)

router.get('/user-details', userDetails)

router.get('/logout', logout)

router.post('/update-user', updateUserDetails)

router.post('/update-password', updatePassword)

router.post("/search-user", searchUser)

router.get('/users', getAllUsers);

module.exports = router
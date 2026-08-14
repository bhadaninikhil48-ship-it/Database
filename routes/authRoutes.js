const express = require("express")

const router = express.Router()

const {loginForm ,loginUser, logoutUser} = require("../controllers/authController")

const{isLoggedIn, isOwner} = require("../middleware/auth")
const{userValidation} = require("../middleware/validation")

router.get("/login", loginForm)
router.post("/login", loginUser)
router.post("/logout", logoutUser)

module.exports = router
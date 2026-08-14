const express = require("express")

const router = express.Router()

const {homePage, showUsers, createUser, showCreateForm, editUserForm, updateUser, deleteUserForm, deleteUser} = require("../controllers/userController")

const{isLoggedIn, isOwner} = require("../middleware/auth")
const{userValidation} = require("../middleware/validation")


router.get("/", homePage)
router.get("/user",showUsers)
router.get("/user/new", showCreateForm);
router.post("/user", userValidation, createUser)
router.get("/user/:id/edit", isLoggedIn, isOwner, editUserForm)
router.patch("/user/:id", isLoggedIn, isOwner, updateUser)
router.get("/user/:id/delete", isLoggedIn, isOwner, deleteUserForm)
router.delete("/user/:id", isLoggedIn, isOwner, deleteUser)

module.exports = router
require("dotenv").config();
const express = require("express")


const app = express()
const path = require("path");

const methodOverride = require("method-override")

const session = require("express-session");
const flash = require("connect-flash");

const authRoutes = require("./routes/authRoutes");

const userRoutes = require("./routes/userRoutes");

app.use(express.urlencoded({ extended: true }))

app.use(
    session({
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: false
    })
);
app.use(flash());

app.use((req,res,next)=>{
  
  res.locals.success = req.flash("success")
  res.locals.error = req.flash("error")

  res.locals.oldUsername = req.flash("oldUsername")[0] || ""
  res.locals.oldEmail = req.flash("oldEmail")[0] || "";

  res.locals.currentUserId = req.session.userId;

  next()
})

app.use(methodOverride("_method"))

app.set("view engine", "ejs")
app.set("views", path.join(__dirname, "/views"))
app.use(express.static(path.join(__dirname, "public")));

app.use(userRoutes)
app.use(authRoutes)

app.listen(3000, () => {
  console.log('Server is running on http://localhost:3000')
})
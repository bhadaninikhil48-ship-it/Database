require("dotenv").config();
const express = require("express")
const { faker } = require('@faker-js/faker');
const { v4: uuidv4 } = require("uuid");
const bcrypt = require("bcrypt")
const { body, validationResult } = require("express-validator");

const app = express()
const path = require("path");

const methodOverride = require("method-override")

const session = require("express-session");
const flash = require("connect-flash");

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

// // Get the client
// const mysql = require('mysql2');

//New
const mysql = require("mysql2/promise");

const { hash } = require("crypto");

// Create the connection to database
// const connection = mysql.createConnection({
//   host: 'localhost',
//   user: 'root',
//   database: 'hostel',
//   password: "MySql@1234$&"
// });

//New
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,

    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

let getRandomData = () => {


  return [
    faker.string.uuid(),
    faker.internet.username(),
    faker.internet.email(),
    // avatar: faker.image.avatar(),
    faker.internet.password(),
    // birthdate: faker.date.birthdate(),
    // registeredAt: faker.date.past(),
  ];

}



//Validater
const userValidation = [
    body("username")
        .trim()
        .notEmpty()
        .withMessage("Username is required"),

    body("email")
        .trim()
        .isEmail()
        .withMessage("Enter a valid email"),

    body("password")
        .isLength({ min: 6 })
        .withMessage("Password must be at least 6 characters")
];

//loggedIn middleware
function isLoggedIn(req, res, next) {

    if (!req.session.userId) {

        req.flash("error", "Please login first!");

        return res.redirect("/login");
    }

    next();
}

//Authorization middleware
function isOwner(req,res,next){

  if(req.session.userId != req.params.id){

    req.flash("error", "Your are not authorized!");

    return res.redirect("/user");

  }

  next();

}


app.get('/', async(req, res) => {

  let q = `select count(*) from user`

 try{

  // const db = await promiseConnection;

  const [result] = await pool.query(

    "SELECT COUNT(*) FROM USER"

  )

  let count = result[0]["count(*)"];

 return res.render("home.ejs", {count})

 }catch(err){

  console.log(err)
  res.flash("error","Some error in database")
 return res.redirect("/login")

 }


})

app.get("/login",(req,res)=>{
  res.render("login.ejs")
})

app.post("/login", async (req, res) => {

    let { email, password } = req.body;

    try {

        // const db = await promiseConnection;

        const [result] = await pool.query(
            "SELECT * FROM user WHERE email = ?",
            [email]
        );

        let user = result[0];

        if (!user) {
            req.flash("error", "Email or password is incorrect!");
            return res.redirect("/login");
        }

        const isMatch = await bcrypt.compare(
            password,
            user.password
        );

        if (!isMatch) {
            req.flash("error", "Email or password is incorrect!");
            return res.redirect("/login");
        }

        req.session.userId = user.id;

        console.log("Logged in user:", req.session.userId);

        req.flash("success", "Login successful!");

        return res.redirect("/user");

    } catch (err) {

        console.log(err);

        req.flash("error", "Something went wrong!");

        return res.redirect("/login");
    }

});

app.post("/logout",(req,res)=>{

  req.session.destroy((err)=>{

    if(err){
      console.log(err)
      return res.send("Could not logout")
    }

    res.redirect("/login")

  })
})

app.get("/test-async", async (req, res) => {

    try {

        // const db = await promiseConnection;

        const [result] = await pool.query(
            "SELECT * FROM user"
        );

        console.log(result);

        res.send(result);

    } catch (err) {

        console.log(err);

        res.send("Database error");

    }
});

app.get("/profile",isLoggedIn,async(req,res)=>{
  
  res.send("Welcome to your profile!")

})


app.get("/user", async(req, res)=>{

  let {search} = req.query;

  try{

    // const db = await promiseConnection;

    let result;

    if(search){

      let searchValue = `%${search}%`;

      const [rows] = await pool.query(

        `select * from user
        where username like ?
        or email like ?
        `,
        [searchValue, searchValue]

      );

      result = rows;

    }else{

      const [rows] = await pool.query(
        "select * from user"
      );

      result = rows;

    }

    res.render("show.ejs",{result, search})

  }catch(err){

    console.log(err)

    req.flash("error", "Database error!")

    return res.redirect("/user")

  }

})

app.get("/user/:id/edit", isLoggedIn, isOwner, async(req, res) => {

  let { id } = req.params
  console.log(id)

  let q = "select * from user where id = ?"

  try {

    // const db = await promiseConnection;

    const [result] = await pool.query(q, [id]);

    let user = result[0];

    if (!user) {
        req.flash("error", "User not found!");
        return res.redirect("/user");
    }

    res.render("edit.ejs", { user });

} catch (err) {

            console.log(err);

            req.flash("error", "Some error in database!");
            return res.redirect("/user");
        }
      

})


app.patch("/user/:id", isLoggedIn, isOwner, async (req, res) => {

    let { id } = req.params;
    let { username: newuser, password: formPass } = req.body;

    try {

        // const db = await promiseConnection;

        // 1. Find user
        const [result] = await pool.query(
            "SELECT * FROM user WHERE id = ?",
            [id]
        );

        let user = result[0];

        if (!user) {
            req.flash("error", "User not found!");
            return res.redirect("/user");
        }

        // 2. Check password
        const isMatch = await bcrypt.compare(
            formPass,
            user.password
        );

        if (!isMatch) {
            req.flash("error", "Wrong password!");
            return res.redirect(`/user/${id}/edit`);
        }

        // 3. Update username
        const q = `
            UPDATE user
            SET username = ?
            WHERE id = ?
        `;

        await pool.query(q, [newuser, id]);

        req.flash("success", "User updated successfully!");

        return res.redirect("/user");

    } catch (err) {

        console.log(err);

        if (err.code === "ER_DUP_ENTRY") {
            req.flash("error", "Username already exists!");
            return res.redirect(`/user/${id}/edit`);
        }

        req.flash("error", "Could not update user!");

        return res.redirect(`/user/${id}/edit`);
    }

});

app.get("/user/:id/delete", isLoggedIn, isOwner, async (req, res) => {

  let { id } = req.params
 

  try {

    //  const db = await promiseConnection;

    const [result] = await pool.query(
                "SELECT * FROM user WHERE id = ?",
                [id]
            );

            let user = result[0];

           
            if (!user) {
                req.flash("error", "User not found!");
                return res.redirect("/user");
            }

           return res.render("delete.ejs",{user})

          }catch(err){
            console.log(err)

            req.flash("error","Some error in database")

            return res.redirect(`/user/${id}/delete`)
          }

        })



app.delete(
    "/user/:id",
    isLoggedIn,
    isOwner,
    async (req, res) => {

        let { id } = req.params;

        let {
            email: formEmail,
            password: formPassword
        } = req.body;

        try {

            // const db = await promiseConnection;

            // 1. Find user
            const [result] = await pool.query(
                "SELECT * FROM user WHERE id = ?",
                [id]
            );

            let user = result[0];

            // 2. Check user exists
            if (!user) {
                req.flash("error", "User not found!");
                return res.redirect("/user");
            }

            // 3. Check email
            if (formEmail !== user.email) {

                req.flash("error", "Wrong email!");

                return res.redirect(`/user/${id}/delete`);
            }

            // 4. Check password
            const isMatch = await bcrypt.compare(
                formPassword,
                user.password
            );

            if (!isMatch) {

                req.flash("error", "Wrong password!");

                return res.redirect(`/user/${id}/delete`);
            }

            // 5. Delete user
            const q = `
                DELETE FROM user
                WHERE id = ?
            `;

            await pool.query(q, [id]);

            // 6. Success
            req.flash(
                "success",
                "User deleted successfully!"
            );

            return res.redirect("/user");

        } catch (err) {

            console.log(err);

            req.flash(
                "error",
                "Could not delete user!"
            );

            return res.redirect(`/user/${id}/delete`);
        }
    }
);


app.get("/user/new",(req, res) => {
  res.render("new.ejs")
})

app.post("/user", isLoggedIn, userValidation, async (req, res) => {

    let { username, email, password } = req.body;

    const errors = validationResult(req);

    if (!errors.isEmpty()) {

        errors.array().forEach(error => {
            req.flash("error", error.msg);
        });

        req.flash("oldUsername", username);
        req.flash("oldEmail", email);

        return res.redirect("/user/new");
    }

    try {

        // const db = await promiseConnection;

        const hash = await bcrypt.hash(password, 10);

        let id = uuidv4();

        let q = `
            INSERT INTO user(id, username, email, password)
            VALUES (?, ?, ?, ?)
        `;

        const [result] = await pool.query(
            q,
            [id, username, email, hash]
        );

        console.log(result);

        req.flash("success", "User created successfully!");

        return res.redirect("/user");

    } catch (err) {

        console.log(err);

        if (err.code === "ER_DUP_ENTRY") {

            if (err.message.includes("user.username")) {

                req.flash("error", "Username already exists!");

            } else if (err.message.includes("user.email")) {

                req.flash("error", "Email already exists!");

            } else {

                req.flash("error", "Duplicate value!");

            }

            req.flash("oldUsername", username);
            req.flash("oldEmail", email);

            return res.redirect("/user/new");
        }

        req.flash("error", "Some error in database!");

        return res.redirect("/user/new");
    }

});


app.listen(3000, () => {
  console.log('Server is running on http://localhost:3000')
})
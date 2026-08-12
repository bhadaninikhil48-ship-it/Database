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
        secret: "mySecret",
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

// Get the client
const mysql = require('mysql2');
const { hash } = require("crypto");

// Create the connection to database
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  database: 'hostel',
  password: "MySql@1234$&"
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

//Inserting new data
// let q = "insert into user (id, username, email, password) VALUES ?"
// let users = [
//   ["321","Nikro","Nikro@gmail.com","hsk*938"],
//   ["221","Likro","Likro@gmail.com","hsk*34938"]
// ]

// let data = [];
// for(let i=1; i<=100; i++){
//   data.push(getRandomData())
// }




// connection.end();

// let password = "abc123";

// bcrypt.hash(password, 10, (err, hash) => {

//     if (err) {
//         console.log(err);
//         return;
//     }

//     console.log("Original:", password);
//     console.log("Hashed:", hash);
// });

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


app.get('/', (req, res) => {

  let q = `select count(*) from user`

  try {
    connection.query(q, (err, result) => {
      if (err) throw err;
      let count = result[0]["count(*)"]
      res.render("home.ejs", { count })
    });
  } catch (err) {
    console.log(err);
    res.send("some err in database")
  }


})

app.get("/login",(req,res)=>{
  res.render("login.ejs")
})

app.post("/login",(req,res)=>{
  let {email, password} = req.body

  console.log(email)
  console.log(password)

  let q = "select * from user where email = ?"

  connection.query(q,[email],(err,result)=>{
    if(err){
      console.log(err)

      req.flash("error","Database error!")
     return res.redirect("/login")
    }

    let user = result[0]

    if (!user) {
            req.flash("error", "Email or password is incorrect!");
            return res.redirect("/login");
        }

    console.log(user)

    bcrypt.compare(password,user.password,(err, isMatch)=>{

      if(err){
        console.log(err)

        req.flash("error","Password comparison error!")
        return res.redirect("/login")
      }

      if(!isMatch){

        req.flash("error","Email or password is incorrect!")
        return res.redirect("/login")

      }

      //Password correct
      console.log("Login successful!")

      req.session.userId = user.id

      console.log("Logged in user:", req.session.userId);

      req.flash("success", "Login successful!")


      return res.redirect("/user")


    })
  })
})

app.post("/logout",(req,res)=>{

  req.session.destroy((err)=>{

    if(err){
      console.log(err)
      return res.send("Could not logout")
    }

    res.redirect("/login")

  })
})

app.get("/profile",isLoggedIn,(req,res)=>{
  
  res.send("Welcome to your profile!")

})

app.get("/user",isLoggedIn, (req, res) => {

  let { search } = req.query
  search = search?.trim();

  // console.log(search)

  if (!search) {

    let q = `select * from user`

    try {
      connection.query(q, (err, result) => {
        if (err) throw err;
        // console.log(result)

        res.render("show.ejs", { result, search: "" })
      });
    } catch (err) {
      console.log(err);
      res.send("some err in database")
    }

  } else {

    let searchValue = `%${search}%`

    let q3 = `

  select * from user
  where username like ?
  or email like ?
  `;

    connection.query(
      q3, [searchValue, searchValue], (err, result) => {
        if (err) {
          console.log(err)
          return res.send("Database error")
        }



        
        res.render("show.ejs", { result, search })
        // console.log(result)

      }
    )


  }




})

app.get("/user/:id/edit", isLoggedIn, isOwner, (req, res) => {

  let { id } = req.params
  console.log(id)

  let q = "select * from user where id = ?"

  try {
    connection.query(q, [id], (err, result) => {
      if (err) throw err;
      // console.log(result)
      let user = result[0]

       if (!user) {
        req.flash("error", "User not found!")
        return res.redirect("/user");
      }

      res.render("edit.ejs", { user })
    });
  } catch (err) {
    console.log(err);
    res.send("some err in database")
  }


})


app.patch("/user/:id", isLoggedIn, isOwner,(req, res) => {

  console.log("PATCH ROUTE HIT");

  let { id } = req.params

  let { username: newuser, password: formPass } = req.body



  let q = "select * from user where id = ?"

  try {
    connection.query(q, [id], (err, result) => {
      if (err) throw err;
      console.log(result)
      let user = result[0]

        if (!user) {
            req.flash("error", "User not found!");
            return res.redirect("/user");
        }

        bcrypt.compare(formPass,user.password,(err,isMatch)=>{

            if (err) {
                console.log(err);
                req.flash("error", "Password comparison error!");
                return res.redirect(`/user/${id}/edit`);
            }


          if (!isMatch) {
            req.flash("error","Wrong password!")
            return res.redirect(`/user/${id}/edit`)
          } 
          
          else {
            let q2 = `update user set username = '${newuser}' where id = '${id}'`
            connection.query(q2, (err, result) => {
               if (err) {
                    console.log(err);
                    req.flash("error", "Could not update user!");
                    return res.redirect(`/user/${id}/edit`);
                }


              req.flash("success", "User updated successfully!");
              res.redirect("/user")
            })
          }
          
        })
  
  
      });
    } catch (err) {
      console.log(err);
      res.send("some err in database")
    }



})

app.get("/user/:id/delete", isLoggedIn, isOwner, (req, res) => {

  let { id } = req.params
  console.log(id)


  let q = "select * from user where id = ?"

  try {
    connection.query(q, [id], (err, result) => {
      if (err) throw err;
      console.log(result)
      let user = result[0]

      if (!user) {
        req.flash("error", "User not found!")
        return res.redirect("/user");
      }

      res.render("delete.ejs", { user })
      // res.send(user)
    });
  } catch (err) {
    console.log(err);
    res.send("some err in database")
  }

})

app.delete("/user/:id",isLoggedIn, isOwner,(req, res) => {

  let { id } = req.params
  console.log(id)

  let { email: formEmail, password: formPassword } = req.body
  console.log(formEmail)

  let q = "select * from user where id = ?"

  try {
    connection.query(q, [id], (err, result) => {
      if (err) throw err;
      console.log(result)
      let user = result[0]



      if (formEmail != user.email) {
        req.flash("error","Wrong email!")
        return res.redirect(`/user/${id}/delete`)
      }else{

      

      bcrypt.compare(formPassword, user.password, (err, isMatch) => {

    if (err) {
        console.log(err);

        req.flash("error", "Password comparison error!");
        return res.redirect(`/user/${id}/delete`);
    }

    if (!isMatch) {

        req.flash("error", "Wrong password!");
        return res.redirect(`/user/${id}/delete`);
    }

    // Password correct
     let q2 = `delete from user where id = '${id}'`

        connection.query(q2, (err, result) => {

          if (err) throw err;
          req.flash("success","User deleted successfully!")

          res.redirect("/user")


        })
});

      }

      // res.render("delete.ejs",{user})
      // res.send(user)
    });
  } catch (err) {
    console.log(err);
    res.send("some err in database")
  }

  // res.send("Delete")

})


app.get("/user/new",(req, res) => {
  res.render("new.ejs")
})

app.post("/user",userValidation,(req, res) => {

   let { username, email, password } = req.body

  const errors = validationResult(req);

  //Validate
  if (!errors.isEmpty()) {

       errors.array().forEach(error => {
        req.flash("error", error.msg);
    });

    req.flash("oldUsername",username)
    req.flash("oldEmail",email)


        return res.redirect("/user/new");
    }


  console.log("EMAIL:", email);
  let id = uuidv4()

  bcrypt.hash(password,10,(err,hash)=>{
    if(err){
      console.log(err)
      req.flash("error","Password hashing error!")
      return res.redirect("/user/new")
    }

    let q = `

  insert into user(id,username,email,password)
  values(?,?,?,?)

  `;
  connection.query(q, [id, username, email, hash], (err, result) => {

    if (err) {

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


      // console.log(err)

      req.flash("error","Some error in database")
      return res.redirect("/user/new");
    }

    console.log(result);

    req.flash("success","User created successfully!")

    res.redirect("/")

  });

  })

  
})


app.listen(3000, () => {
  console.log('Server is running on http://localhost:3000')
})
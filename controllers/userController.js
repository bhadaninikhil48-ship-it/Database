const pool = require("../config/db")
const { v4: uuidv4 } = require("uuid");
const bcrypt = require("bcrypt")
const { body, validationResult } = require("express-validator");


const homePage = async(req, res)=>{

    let q = `select count(*) from user`

 try{

  // const db = await promiseConnection;

  const [result] = await pool.query(

    "SELECT COUNT(*) FROM USER"

  )

  let count = result[0]['COUNT(*)'];
 

 return res.render("home.ejs", {count})

 }catch(err){

  console.log(err)
  res.flash("error","Some error in database")
 return res.redirect("/login")

 }

}

const showUsers = async(req, res)=>{

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
}

const showCreateForm = (req, res) => {
    res.render("new.ejs");
};

const createUser = async(req,res)=>{

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
    
            req.session.userId = id;

            console.log("New user logged in!");
            
    
            req.flash("success", "Account created and logged in successfully!");
    
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

}

const editUserForm = async(req, res) => {

  let { id } = req.params
  console.log(id)

  let q = "select * from user where id = ?"

  try {

    // const db = await promiseConnection;

    const [result] = await pool.query(q, [id]);

    let user = result[0];

    if (!user) {
        req.flash("error", "User not found!");
        return res.redirect("/user")
    }

    res.render("edit.ejs", { user });

} catch (err) {

            console.log(err);

            req.flash("error", "Some error in database!");
            return res.redirect("/user");
        }
    }   


const updateUser = async(req, res)=>{

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



}

const deleteUserForm = async(req, res)=>{

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

}


const deleteUser = async(req, res)=>{

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






module.exports = {homePage, showUsers, createUser, showCreateForm, editUserForm, updateUser, deleteUserForm, deleteUser}

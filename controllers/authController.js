const pool = require("../config/db")

const bcrypt = require("bcrypt")




const loginUser =  async (req, res) => {

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

};

const loginForm = (req,res)=>{
    res.render("login.ejs")
}

const logoutUser = (req,res)=>{

      req.session.destroy((err)=>{

    if(err){
      console.log(err)
      return res.send("Could not logout")
    }

    res.redirect("/login")

  })

}

module.exports = {loginUser, loginForm, logoutUser}
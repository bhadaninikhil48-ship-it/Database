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

module.exports = {isLoggedIn, isOwner}
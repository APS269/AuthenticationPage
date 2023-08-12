require('dotenv').config();
const express = require('express');
const bodyParser = require("body-parser");
const ejs = require("ejs");
const app = express();
const mongoose = require("mongoose");

const session = require("express-session");
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy; // Import LocalStrategy

const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth2').Strategy;
const findOrCreate = require('mongoose-findorcreate')
app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));

app.use(session({
    secret: "Our little secret.",
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb+srv://aps269:"+process.env.PASS+"@cluster0.pfe9zuy.mongodb.net/?retryWrites=true&w=majority",{ useNewUrlParser: true, useUnifiedTopology: true });

const userSchema = new mongoose.Schema({
    email: String,
    password: String,
  googleId: String,
  secret: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);
const User = new mongoose.model("User", userSchema);

// Use LocalStrategy and define strategy implementation
passport.use(new LocalStrategy(User.authenticate())); // Use authenticate() method

passport.serializeUser(function(user, cb) {
    process.nextTick(function() {
      cb(null, { id: user.id, username: user.username, name: user.name });
    });
  });
  
  passport.deserializeUser(function(user, cb) {
    process.nextTick(function() {
      return cb(null, user);
    });
  });

passport.use(new GoogleStrategy({
    clientID:  process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL:"https://www.googleapis.com/oauth2/v3/userinfo",
    passReqToCallback   : true
  },
  function(request, accessToken, refreshToken, profile, done) {
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return done(err, user);
    });
  }
));
 
app.get("/", (req, res) => {
    res.render("home");
});

app.get('/auth/google',
  passport.authenticate('google', { scope: ['email', 'profile'] })
);

app.get('/auth/google/secrets',
  passport.authenticate('google', {
    successRedirect: '/secrets',
    failureRedirect: '/login'
  })
);

app.get("/login", (req, res) => {
  res.render("login");
});


app.get("/register", (req, res) => {
    res.render("register");
});

app.get("/secrets", (req,res) => {
  User.find({ "secret": { $ne: null } })
    .then((found) => { if (found) res.render("secrets", { userWithSecrets:found }); })
    .catch((err) => console.log(err));
})

app.get("/submit", (req, res) => {
  if (req.isAuthenticated()) res.render("submit");
  else res.redirect("/login");

});

app.post("/submit", ensure,(req, res) => {
  const submitted = req.body.secret;
  
  User.findById(req.user.id)
    .then(found => {
      if (found) {
        found.secret = submitted;
        return found.save();
      }
    })
    .then(() => {
      res.redirect("/secrets");
    })
    .catch(error => {
      console.error(error);
      res.redirect("/secrets"); 
    });
});
function ensure(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  } else {
    res.redirect("/login"); // Redirect to login if not authenticated
  }
}
app.get("/logout", function(req, res) {
    req.logout(function(err) {
        if (err) {
            console.log(err);
        }
        res.redirect("/");
    });
});


app.post("/register", (req, res) => {
    User.register({ username: req.body.username }, req.body.password)
        .then((user) =>{passport.authenticate("local")(req,res,()=>{res.redirect("/secrets")})})
        .catch((error) => { console.log(error); res.redirect("/register"); });
});

app.post("/login", (req, res) => {
    const user = new User({
        username: req.body.username,
        password: req.body.password
    });

    req.login(user, (error) => {
        if (error) {
            console.log(error);
            res.redirect("/login"); 
        } else {
            passport.authenticate("local")(req, res, () => {
                res.redirect("/secrets");
            });
        }
    });
});
 

app.listen(3000, () => {
    console.log("Server started at port 3000");
});



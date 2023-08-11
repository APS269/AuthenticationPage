//add .env as early as possible in the file
require('dotenv').config();
const express = require('express');
const bodyParser = require("body-parser");
const ejs = require("ejs");
const app = express();
const mongoose = require("mongoose");

const md5 = require("md5");

app.use(express.static("public"));
app.set("view engine", "ejs");


app.use(bodyParser.urlencoded({
    extended: true
}));

app.get("/",(req,res)=>
    {
    res.render("home");
})
mongoose.connect("mongodb://127.0.0.1:27017/userDB", { useNewUrlParser: true });

//object from mongoose schema class
const userSchema = new mongoose.Schema({
    email: String,
    password: String
});


const User = new mongoose.model("User",userSchema);



app.get("/login", (req, res) => {
    res.render("login");
});
app.get("/register", (req, res) => {
    res.render("register");
});

app.post("/register", (req,res) =>
{
    const newUser = new User({
        email: req.body.username,
        password: md5(req.body.password)
    })
    newUser.save()
        .then(() =>res.render("secrets"))
        .catch((error) => console.log(error));
})

app.post("/login", (req, res) => {
    const username = req.body.username;
    const password = md5(req.body.password);

    User.findOne({
        email: username
    })
        .then((data) => { if (data.password == password) res.render("secrets"); else res.send("Wrong pass")})
        .catch((error) => console.log(error));
})

app.listen(3000, () => {console.log("Server started at 3000") });



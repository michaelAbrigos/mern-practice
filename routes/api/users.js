const express = require('express');
const router = express.Router();
const gravatar = require('gravatar'); // avatar
const bcrypt = require('bcryptjs'); // hashing
const jwt = require('jsonwebtoken'); // generate JWT
const keys = require('../../config/keys'); // config files
const passport = require('passport');

const validateRegisterInput = require('../../validation/register');
const validateLoginInput = require('../../validation/login');

const User = require('../../models/User'); // mongoose model

router.get('/test', (req, res) => res.json({msg: "Users Works"}));

router.post('/register', (req, res) => {
  const { errors, isValid } = validateRegisterInput(req.body);

  //validation check
  if (!isValid) {
    return res.status(400).json(errors);
  }

  User.findOne({ email: req.body.email })
    .then(user => {
      if(user) {
        return res.status(400).json({email: 'Email Already Exists'})
      } else {
        const avatar = gravatar.url(req.body.email, {
          s: '200', //size
          r: 'pg', //rating
          d: 'mm', //default
        })
        const newUser = new User({
          name: req.body.name,
          email: req.body.email,
          avatar,
          password: req.body.password
        });

        bcrypt.genSalt(10, (err, salt) => {
          bcrypt.hash(newUser.password, salt, (err, hash) => {
            if(err) throw err;
            newUser.password = hash;
            newUser.save()
              .then(user => (res.json(user)))
              .catch(err => console.log(err)); 
          })
        })
      }
    }) 
});

router.post('/login', (req, res) => {
  const email = req.body.email;
  const password = req.body.password;

  const { errors, isValid } = validateLoginInput(req.body);

  //validation check
  if (!isValid) {
    return res.status(400).json(errors);
  }

  //find user by email
  User.findOne({email})
    .then(user => {
      //check user
      if(!user) {
        errors.email = 'User not found';
        return res.status(404).json(errors);
      }
      //check password
      bcrypt.compare(password, user.password)
        .then(isMatch => {
          if(isMatch) {
            const payload = { id: user.id, name: user.name, avatar: user.avatar } //payload
            
            jwt.sign(
              payload, 
              keys.secretKey, 
              { expiresIn: 3600 }, 
              (err, token) => {
                res.json({
                  success: true,
                  token: 'Bearer ' + token 
                })
            });
          } else {
            errors.password = 'Incorrect credentials';
            return res.status(404).json(errors);
          }
        });
    });
});

router.get('/current', passport.authenticate('jwt', { session: false} ), (req, res) => {
  res.json({
    id: req.user.id,
    name: req.user.name,
    email: req.user.email
  });
});

module.exports = router; 
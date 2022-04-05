require('dotenv').config();
const dotenv = require('dotenv');
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const utils = require('./utils');

const app = express();

const port = process.env.PORT || 4000;

dotenv.config({ path: './.env' });
var con = require('./db/conn');



// enable CORS
app.use(cors());

// parse application/json
app.use(bodyParser.json());
// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: true }));


//middleware that checks if JWT token exists and verifies it if it does exist.
//In all future routes, this helps to know if the request is authenticated or not.
app.use(function (req, res, next) {
  // check header or url parameters or post parameters for token
  var token = req.headers['authorization'];
  //  console.log(token);
  if (!token) return next(); //if no token, continue

  token = token.replace('Bearer ', '');
  jwt.verify(token, process.env.JWT_SECRET, function (err, user) {
    if (err) {
      return res.status(401).json({
        success: false,
        message: "Invalid user."
      });
    } else {
      req.user = user; //set the user to req so other routes can use it
      next();
    }
  });
});


// request handlers
app.get('/', (req, res) => {
  if (!req.user) return res.status(401).json({ success: false, message: 'Invalid user to access it.' });
  res.send('Welcome to the Task Page - ' + req.user.name);
});


// register the users

app.post('/user/register', function (req, res) {
  //console.log(req.body);
  const { Email } = req.body;
  console.log(req.body);
  if (!Email) {
    return res.status(400).json({
      status: false,
      message: "Please fill all fields."
    });
  }

  try {
    con.getConnection(function (err, connection) {
      var sql = `SELECT * FROM users where email = '${Email}'`;
      connection.query(sql, function (err, result) {
        if (err) throw err;

        if (result.length > 0) {
          res.status(201).json({ status: false, message: "Email already registered" });
        } else {
          var sql = `INSERT INTO users (email) VALUES ('${Email}')`;
          connection.query(sql, function (err, result) {
            if (err) throw err;
            res.status(200).json({ status: true, message: "user created successfully" });
          });
        }
      });
    });

  } catch (err) {
    console.log(err);
  }
});

// validate the user credentials
app.post('/user/signin', function (req, res) {
  const user = req.body.Email;

  // return 400 status if username/password is not exist
  if (!user) {
    return res.status(400).json({
      error: true,
      message: "Username required."
    });
  }

  try {
    con.getConnection(function (err, connection) {
      var sql = `SELECT * FROM users where email = '${user}'`;
      connection.query(sql, function (err, result) {
        if (err) throw err;
        if (result.length > 0) {
          // generate token
          const token = utils.generateToken(result[0]);
          // get basic user details
          const userObj = utils.getCleanUser(result[0]);
          // return the token along with user details
          return res.json({ user: userObj, token });
        } else {
          return res.status(401).json({
            error: true,
            message: "Username is Wrong."
          });
        }
      });
    });

  } catch (err) {
    console.log(err);
  }
  // return 401 status if the credential is not match.
});


// verify the token and return it if it's valid
app.get('/verifyToken', function (req, res) {
  // check header or url parameters or post parameters for token
  var token = req.body.token || req.query.token;
  if (!token) {
    return res.status(400).json({
      error: true,
      message: "Token is required."
    });
  }
  // check token that was passed by decoding token using secret
  jwt.verify(token, process.env.JWT_SECRET, function (err, user) {
    if (err) return res.status(401).json({
      error: true,
      message: "Invalid token."
    });

    try {

      con.getConnection(function (err, connection) {
        var sql = `SELECT * FROM users where email = '${user.username}' && id = '${user.userId}'`;
        connection.query(sql, function (err, result) {
          if (err) throw err;
          //console.log(result.length);
          if (result.length > 0) {
            // generate token
            var userObj = utils.getCleanUser(result[0]);
            return res.json({ user: userObj, token });
          } else {
            return res.status(401).json({
              error: true,
              message: "Invalid user."
            });
          }
        });
      });

    } catch (err) {
      console.log(err);
    }
  });
});


app.post('/games/quez', function (req, res) {

  try {
    con.getConnection(function (err, connection) {
      var sql = `SELECT * FROM quiz ORDER BY RAND() `;
      connection.query(sql, function (err, result) {
        if (err) throw err;
        //console.log(result.length);
        if (result.length > 0) {
          return res.status(200).json({ success: true, data: result });
        } else {
          return res.status(401).json({
            success: false,
            message: "no result found."
          });
        }
      });
    });

  } catch (err) {
    console.log(err);
  }
});


app.post('/games/submit', function (req, res) {
  const { submit } = req.body;
  if (!submit) {
    return res.status(400).json({
      success: false,
      message: "Please provide Data."
    });
  }
  var token = req.headers['authorization'];
  token = token.replace('Bearer ', '');
  jwt.verify(token, process.env.JWT_SECRET, function (err, user) {
    if (err) return res.status(401).json({
      error: true,
      message: "Invalid token."
    });
    try {
      submit.map((item) => {
        let quizId = item.id;
        let quizAns = item.answer;
        con.getConnection(function (err, connection) {
          var sql = `SELECT answer FROM quiz where id = '${quizId}'  `;
          connection.query(sql, function (err, result) {
            if (err) throw err;
            let answerCorrect;

            if (result.length > 0) {
              // generate token
              if (result[0].answer == quizAns) {
                answerCorrect = 'yes';

              } else {
                answerCorrect = 'no';
              }
              var sql = `INSERT quiz_users (quiz_id,user_id,answer,is_correct) VALUES ('${quizId}','${user.userId}','${quizAns}','${answerCorrect}')  `;
              connection.query(sql, function (err, result) {
                if (err) throw err;
                return res.status(200).json({
                  success: true,
                  message: `Your Quiz has been completed successfully.`
                });
              })
            }
          });
        });
      });
    } catch (err) {
      console.log(err);
    }

  });
});



app.post('/games/score', function (req, res) {

  var token = req.headers['authorization'];
  token = token.replace('Bearer ', '');
  jwt.verify(token, process.env.JWT_SECRET, function (err, user) {
    if (err) return res.status(401).json({
      error: true,
      message: "Invalid token."
    });
    try {
      con.getConnection(function (err, connection) {
        var sql = `SELECT is_correct, count(is_correct) as answerCnt  FROM quiz_users where user_id = '${user.userId}' GROUP BY is_correct`;
        connection.query(sql, function (err, result) {
          if (err) throw err;
          if (result.length > 0) {
              return res.status(200).json({
                success: true,
                message: result
              });
          }
        });
      });
    } catch (err) {
      console.log(err);
    }

  });
});



app.listen(port, () => {
  console.log('Server started on: ' + port);
});

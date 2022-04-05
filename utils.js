// generate token using secret from process.env.JWT_SECRET
var jwt = require('jsonwebtoken');

// generate token and return it
function generateToken(user) {
  if (!user) return null;

  var u = {
    userId: user.id,
    username: user.email
  };

  return jwt.sign(u, process.env.JWT_SECRET, {
    expiresIn: 60 * 60 * 24 // expires in 24 hours
  });
}

// return basic user details
function getCleanUser(user) {
  if (!user) return null;

  return {
    userId: user.id,
    username: user.email
  };
}

module.exports = {
  generateToken,
  getCleanUser
}

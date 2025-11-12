const { ALLOWED_USERNAMES } = require('../config/constants');
const { User } = require('../models');

const authMiddleware = async (req, res, next) => {
  try {
    const username = req.header('x-user');

    if (!username || !ALLOWED_USERNAMES.includes(username.toLowerCase())) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const [user] = await User.findOrCreate({
      where: { username: username.toLowerCase() },
      defaults: {},
    });

    req.user = { id: user.id, username: user.username };
    return next();
  } catch (error) {
    return res.status(500).json({ message: 'Authentication failed' });
  }
};

module.exports = { authMiddleware };

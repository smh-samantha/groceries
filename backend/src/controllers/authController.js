const { z } = require('zod');
const { ALLOWED_USERNAMES } = require('../config/constants');
const { User } = require('../models');

const loginSchema = z.object({
  username: z.string().min(1),
});

const login = async (req, res) => {
  try {
    const { username } = loginSchema.parse(req.body);
    const normalized = username.toLowerCase();

    if (!ALLOWED_USERNAMES.includes(normalized)) {
      return res.status(401).json({ message: 'Access denied' });
    }

    const [user] = await User.findOrCreate({
      where: { username: normalized },
      defaults: {},
    });

    return res.json({ user: { id: user.id, username: user.username } });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

module.exports = { login };

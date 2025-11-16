const { Sequelize } = require('sequelize');

const connectionString = process.env.DATABASE_URL?.trim();

if (!connectionString) {
  throw new Error('DATABASE_URL is required');
}

try {
  // Validate connection string early so deployment errors are clearer.
  new URL(connectionString);
} catch (error) {
  throw new Error(`DATABASE_URL is invalid: ${error.message}`);
}

const sequelize = new Sequelize(connectionString, {
  dialect: 'postgres',
  protocol: 'postgres',
  logging: false,
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false,
    },
  },
});

module.exports = { sequelize };

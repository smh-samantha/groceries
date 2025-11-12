const { Sequelize } = require('sequelize');

const {
  DATABASE_URL,
  DB_HOST = 'postgres',
  DB_PORT = 5432,
  DB_USER = 'meals_user',
  DB_PASSWORD = 'meals_pass',
  DB_NAME = 'meals_db',
  NODE_ENV = 'development',
} = process.env;

const sequelize = new Sequelize(
  DATABASE_URL || `postgres://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}`,
  {
    dialect: 'postgres',
    logging: NODE_ENV === 'development' ? console.log : false,
  },
);

module.exports = { sequelize };

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

const connectionString =
  DATABASE_URL || `postgres://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}`;

const sslRequired =
  connectionString?.includes('sslmode=require') || connectionString?.includes('ssl=true');

const sequelize = new Sequelize(connectionString, {
  dialect: 'postgres',
  logging: NODE_ENV === 'development' ? console.log : false,
  dialectOptions: sslRequired
    ? {
        ssl: {
          require: true,
          rejectUnauthorized: false,
        },
      }
    : {},
});

module.exports = { sequelize };

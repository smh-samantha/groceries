const { Sequelize } = require('sequelize');

const useRemoteDb = process.env.USE_REMOTE_DB === 'true';
const remoteConnection = process.env.DATABASE_URL?.trim();
const localConnection = process.env.LOCAL_DATABASE_URL?.trim();

let connectionString;

if (useRemoteDb) {
  if (!remoteConnection) {
    throw new Error('DATABASE_URL is required when USE_REMOTE_DB=true');
  }
  connectionString = remoteConnection;
} else {
  connectionString = localConnection || remoteConnection;
  if (!connectionString) {
    throw new Error('LOCAL_DATABASE_URL is required when USE_REMOTE_DB=false');
  }
}

try {
  // Validate connection string early so deployment errors are clearer.
  new URL(connectionString);
} catch (error) {
  throw new Error(`Database connection string is invalid: ${error.message}`);
}

const dialectOptions = useRemoteDb
  ? {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
    }
  : {};

const sequelize = new Sequelize(connectionString, {
  dialect: 'postgres',
  protocol: 'postgres',
  logging: false,
  dialectOptions,
});

module.exports = { sequelize };

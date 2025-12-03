require('dotenv').config();
const express = require('express');
const cors = require('cors');
const routes = require('./routes');
const { sequelize } = require('./config/database');
require('./models'); // ensure associations initialize

const PORT = process.env.PORT || 4000;

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (_, res) => res.json({ status: 'ok' }));
app.use('/api', routes);

const migrateMealsTable = async () => {
  const qi = sequelize.getQueryInterface();
  try {
    const table = await qi.describeTable('meals');
    if (table) {
      if (!table.recipe_link) {
        await sequelize.query('ALTER TABLE "meals" ADD COLUMN IF NOT EXISTS "recipe_link" TEXT;');
      }
      if (!table.recipe_attachment) {
        await sequelize.query(
          'ALTER TABLE "meals" ADD COLUMN IF NOT EXISTS "recipe_attachment" TEXT[] DEFAULT \'{}\'::TEXT[] NOT NULL;',
        );
      }
      const prefType = table.preference?.type || '';
      if (!prefType.includes('[]')) {
        await sequelize.query('ALTER TABLE "meals" ALTER COLUMN "preference" DROP DEFAULT;');
        await sequelize.query(
          'ALTER TABLE "meals" ALTER COLUMN "preference" TYPE VARCHAR(255)[] USING ARRAY["preference"];',
        );
        await sequelize.query('ALTER TABLE "meals" ALTER COLUMN "preference" SET DEFAULT ARRAY[\'dinner\'];');
      }
    }
  } catch (error) {
    console.warn('Meal table migration skipped or failed:', error.message);
  }
};

const start = async () => {
  try {
    await sequelize.authenticate();
    await migrateMealsTable();
    const autoMigrate = process.env.DB_AUTO_MIGRATE !== 'false';
    await sequelize.sync(autoMigrate ? { alter: true } : undefined);
    console.log('Database connected & models synced.');
    app.listen(PORT, () => {
      console.log(`Backend listening on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server', error);
    process.exit(1);
  }
};

start();

module.exports = app;

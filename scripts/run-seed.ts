/**
 * Run seed against the database specified by DATABASE_URL.
 * Loads .env by default; use DOTENV_CONFIG_PATH=.env.staging for staging.
 * Usage: npm run seed  |  npm run seed:staging
 */
import { config } from "dotenv";

const path = process.env.DOTENV_CONFIG_PATH || process.env.dotenv_config_path || ".env";
config({ path });

const { seedDatabase } = await import("../server/seed");

seedDatabase()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  });

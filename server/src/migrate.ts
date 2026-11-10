import { SCHEMA, closeDb, getDb } from "./db.js";

// Creates the tables on the database in DATABASE_URL (safe to run again).
const db = await getDb();
await db.exec(SCHEMA);
console.log(`schema applied (${db.driver})`);
await closeDb();

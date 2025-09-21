// db.js
const { Pool } = require("pg");

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'internship_portal',
  password: 'Admin@123',
  port: 5432,
});

module.exports = pool;   // ✅ must export pool

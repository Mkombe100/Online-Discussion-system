const { Pool } = require('pg');

const pool = new Pool({
  connectionString: "postgresql://neondb_owner:npg_PaHvuTeSrY28@ep-sparkling-dream-apmpcx67-pooler.c-7.us-east-1.aws.neon.tech/neondb?sslmode=verify-full&channel_binding=require",
  ssl: {
    rejectUnauthorized: false
  }
});

module.exports = pool;
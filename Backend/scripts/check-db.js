const { verifyConnection, getDb } = require('../src/config/db');

(async () => {
  try {
    await verifyConnection();
    const db = getDb();
    const rows = await db.all('SELECT id, name, email, isVerified FROM users');
    console.log('Users:', rows);
  } catch (err) {
    console.error(err);
  }
})();
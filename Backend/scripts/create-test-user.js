const { verifyConnection, getDb } = require('../src/config/db');
const User = require('../src/models/user.model');

(async () => {
  try {
    await verifyConnection();
    const newUser = await User.createUser({ name: 'Test User', email: 'test@example.com', password: 'Password123!', otp: '123456', otpExpires: new Date(Date.now() + 10*60*1000) });
    console.log('Created:', newUser);
    const db = getDb();
    const rows = await db.all('SELECT id, name, email, isVerified FROM users');
    console.log('Users:', rows);
  } catch (err) {
    console.error(err);
  }
})();
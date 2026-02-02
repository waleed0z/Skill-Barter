const User = require('./src/models/user.model');

async function testFindUser() {
    try {
        console.log('Testing findUserByEmail...');
        const user = await User.findUserByEmail('test@example.com');
        console.log('User found:', user);
        console.log('isVerified value:', user.isVerified);
        console.log('Type of isVerified:', typeof user.isVerified);
        
        if (user && user.isVerified) {
            console.log('User is verified - login should work!');
        } else {
            console.log('User is not verified or not found');
        }
    } catch (error) {
        console.error('Error in test:', error);
    }
}

testFindUser();
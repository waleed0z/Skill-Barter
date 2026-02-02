// Test script for credit endpoints after migrating from Neo4j to SQLite
const { db } = require('./src/config/db.sqlite');
const { getBalance, getHistory, transferCredits } = require('./src/controllers/credit.controller');
const { v4: uuidv4 } = require('uuid');

// Mock request object for testing
const mockReq = (userId) => ({
    user: { id: userId }
});

// Mock response object for testing
const mockRes = () => {
    const res = {};
    res.status = (code) => {
        res.statusCode = code;
        return res;
    };
    res.json = (data) => {
        res.data = data;
        console.log('Response data:', data);
        return res;
    };
    res.send = (data) => {
        res.data = data;
        console.log('Response data:', data);
        return res;
    };
    return res;
};

async function testCreditEndpoints() {
    console.log('Testing credit endpoints after Neo4j to SQLite migration...\n');
    
    // First, let's create two test users if they don't exist
    const user1Id = 'user1-' + uuidv4();
    const user2Id = 'user2-' + uuidv4();
    
    // Insert test users into database
    await new Promise((resolve, reject) => {
        db.run(`INSERT INTO users (id, name, email, password, time_credits) VALUES (?, ?, ?, ?, ?)`, 
               [user1Id, 'Test User 1', 'user1@test.com', 'hashed_password', 100], 
               function(err) {
                   if (err && err.errno !== 19) { // Ignore duplicate key error
                       console.error('Error creating user 1:', err);
                       reject(err);
                   } else {
                       console.log('Test user 1 created/updated');
                       resolve();
                   }
               });
    });
    
    await new Promise((resolve, reject) => {
        db.run(`INSERT INTO users (id, name, email, password, time_credits) VALUES (?, ?, ?, ?, ?)`, 
               [user2Id, 'Test User 2', 'user2@test.com', 'hashed_password', 50], 
               function(err) {
                   if (err && err.errno !== 19) { // Ignore duplicate key error
                       console.error('Error creating user 2:', err);
                       reject(err);
                   } else {
                       console.log('Test user 2 created/updated');
                       resolve();
                   }
               });
    });
    
    console.log('\n--- Testing getBalance ---');
    try {
        const req = mockReq(user1Id);
        const res = mockRes();
        await getBalance(req, res);
        console.log('✓ getBalance test completed');
    } catch (error) {
        console.error('✗ getBalance test failed:', error);
    }
    
    console.log('\n--- Testing getHistory ---');
    try {
        const req = mockReq(user1Id);
        const res = mockRes();
        await getHistory(req, res);
        console.log('✓ getHistory test completed');
    } catch (error) {
        console.error('✗ getHistory test failed:', error);
    }
    
    console.log('\n--- Testing transferCredits ---');
    try {
        // Test transferring credits from user1 to user2
        const result = await transferCredits(user1Id, 'user2@test.com', 25);
        console.log('Transfer result:', result);
        console.log('✓ transferCredits test completed');
    } catch (error) {
        console.error('✗ transferCredits test failed:', error);
    }
    
    console.log('\n--- Verifying balances after transfer ---');
    try {
        const req = mockReq(user1Id);
        const res = mockRes();
        await getBalance(req, res);
        console.log('User 1 balance after transfer:', res.data);
    } catch (error) {
        console.error('Error getting user 1 balance:', error);
    }
    
    try {
        const req = mockReq(user2Id);
        const res = mockRes();
        await getBalance(req, res);
        console.log('User 2 balance after transfer:', res.data);
    } catch (error) {
        console.error('Error getting user 2 balance:', error);
    }
    
    console.log('\nCredit endpoints testing completed!');
    db.close();
}

testCreditEndpoints();
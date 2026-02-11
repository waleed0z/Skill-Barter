#!/usr/bin/env node
const http = require('http');
const jwt = require('jsonwebtoken');

const BASE_URL = 'http://localhost:3000';
const JWT_SECRET = process.env.JWT_SECRET || 'skillbarter_secret';

// Test user data
const studentEmail = `student-test-${Date.now()}@test.com`;
const teacherEmail = `teacher-test-${Date.now()}@test.com`;
const password = 'Password123';

let studentId, teacherId, sessionId, studentToken, teacherToken;

function makeRequest(method, path, body = null, token = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(BASE_URL + path);
        const options = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname + url.search,
            method: method,
            headers: {
                'Content-Type': 'application/json',
            }
        };

        if (token) {
            options.headers['Authorization'] = `Bearer ${token}`;
        }

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                try {
                    resolve({
                        status: res.statusCode,
                        data: data ? JSON.parse(data) : null
                    });
                } catch (e) {
                    resolve({
                        status: res.statusCode,
                        data: data
                    });
                }
            });
        });

        req.on('error', reject);

        if (body) {
            req.write(JSON.stringify(body));
        }
        req.end();
    });
}

async function runTest() {
    console.log('=== Credit Payout Test ===\n');

    try {
        // Step 1: Register student
        console.log('Step 1: Registering student...');
            let res = await makeRequest('POST', '/auth/signup', {
                name: 'Test Student',
                email: studentEmail,
                password: password,
                confirmPassword: password
            });
        console.log(`Response: ${JSON.stringify(res.data)}`);
        console.log(`Student registration: ${res.status}`);
        if (res.status !== 201 && res.status !== 200) {
            // Try to log in instead
            res = await makeRequest('POST', '/auth/login', {
                email: studentEmail,
                password: password
            });
        }
        studentToken = res.data.token;
        studentId = res.data.user.id;
        console.log(`Student ID: ${studentId}`);
        console.log(`Student Token: ${studentToken ? '✓' : '✗'}`);

        // Step 2: Register teacher
        console.log('\nStep 2: Registering teacher...');
                res = await makeRequest('POST', '/auth/signup', {
                name: 'Test Teacher',
                email: teacherEmail,
                password: password,
                confirmPassword: password
            }, teacherToken);
        console.log(`Teacher registration: ${res.status}`);
        if (res.status !== 201 && res.status !== 200) {
            res = await makeRequest('POST', '/auth/login', {
                email: teacherEmail,
                password: password
            });
        }
        teacherToken = res.data.token;
        teacherId = res.data.user.id;
        console.log(`Teacher ID: ${teacherId}`);
        console.log(`Teacher Token: ${teacherToken ? '✓' : '✗'}`);

        // Step 3: Check initial credit balances
        console.log('\nStep 3: Checking initial credit balances...');
        res = await makeRequest('GET', '/credits/balance', null, studentToken);
        console.log(`Student balance: ${res.data.balance} credits`);

        res = await makeRequest('GET', '/credits/balance', null, teacherToken);
        console.log(`Teacher balance: ${res.data.balance} credits`);

        // Step 4: Add a skill as teacher
        console.log('\nStep 4: Teacher adding a skill...');
        res = await makeRequest('POST', '/skills', {
            name: `Test Skill ${Date.now()}`,
            type: 'TEACH'
        }, teacherToken);
        console.log(`Skill added: ${res.status}`);
        const skillId = res.data.skillId || 1;
        console.log(`Skill ID: ${skillId}`);

        // Step 5: Schedule a session
        console.log('\nStep 5: Student scheduling a session...');
        res = await makeRequest('POST', '/sessions', {
            teacherId: teacherId,
            skillId: skillId,
            scheduledTime: new Date(Date.now() + 3600000).toISOString(),
            duration: 30
        }, studentToken);
        console.log(`Session scheduled: ${res.status}`);
        sessionId = res.data.sessionId;
        console.log(`Session ID: ${sessionId}`);
        console.log(`Credit amount: ${res.data.creditAmount}`);

        // Step 6: Check balances after scheduling
        console.log('\nStep 6: Checking balances after scheduling...');
        res = await makeRequest('GET', '/credits/balance', null, studentToken);
        console.log(`Student balance: ${res.data.balance} credits`);

        res = await makeRequest('GET', '/credits/balance', null, teacherToken);
        console.log(`Teacher balance: ${res.data.balance} credits`);

        // Step 6.25: Grant credits to student for testing via direct DB manipulation
        console.log('\nStep 6.25: Granting 5 credits to student for testing...');
        const { db } = require('./src/config/db');
        await new Promise(resolve => {
            db.run('UPDATE users SET time_credits = ? WHERE id = ?', [5, studentId], resolve);
        });
        res = await makeRequest('GET', '/credits/balance', null, studentToken);
        console.log(`Student balance after grant: ${res.data.balance} credits`);

        // Step 6.5: Student joins the session (should deduct and hold credits)
        console.log('\nStep 6.5: Student joining session (deduct/hold credits)...');
        res = await makeRequest('GET', `/sessions/${sessionId}/join`, null, studentToken);
        console.log(`Join response: ${res.status} - ${JSON.stringify(res.data)}`);

        // Wait a moment for join transaction
        await new Promise(r => setTimeout(r, 500));

        // Check balances after join
        res = await makeRequest('GET', '/credits/balance', null, studentToken);
        console.log(`Student balance after join: ${res.data.balance} credits`);
        res = await makeRequest('GET', '/credits/balance', null, teacherToken);
        console.log(`Teacher balance after join: ${res.data.balance} credits`);

        // Step 7: Mark session as completed (as teacher)
        console.log('\nStep 7: Teacher marking session as completed...');
        res = await makeRequest('PUT', `/sessions/${sessionId}/status`, {
            status: 'completed'
        }, teacherToken);
        console.log(`Session marked completed: ${res.status}`);

        // Wait a moment for async payout to complete
        await new Promise(r => setTimeout(r, 1000));

        // Step 8: Check final balances
        console.log('\nStep 8: Checking final balances...');
        res = await makeRequest('GET', '/credits/balance', null, studentToken);
        const finalStudentBalance = res.data.balance;
        console.log(`Student balance: ${finalStudentBalance} credits`);

        res = await makeRequest('GET', '/credits/balance', null, teacherToken);
        const finalTeacherBalance = res.data.balance;
        console.log(`Teacher balance: ${finalTeacherBalance} credits`);

        // Step 9: Verify transaction
        console.log('\nStep 9: Checking transaction history...');
        res = await makeRequest('GET', '/credits/history', null, teacherToken);
        console.log(`Transaction history: ${res.status}`);
        if (res.data && res.data.length > 0) {
            console.log('Recent transactions:');
            res.data.slice(0, 3).forEach(tx => {
                console.log(`  - ${tx.type}: ${tx.amount} credits from ${tx.from_user || 'system'}`);
            });
        }

        console.log('\n=== Test Complete ===');
    } catch (error) {
        console.error('Error:', error.message);
    }
}

runTest();

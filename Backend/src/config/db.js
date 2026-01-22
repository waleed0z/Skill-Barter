const neo4j = require('neo4j-driver');
require('dotenv').config();

const uri = process.env.NEO4J_URI || 'bolt://localhost:7687';
const user = process.env.NEO4J_USER || 'neo4j';
const password = process.env.NEO4J_PASSWORD || 'password';

const driver = neo4j.driver(uri, neo4j.auth.basic(user, password));

const verifyConnection = async () => {
    try {
        await driver.verifyConnectivity();
        console.log('Connected to Neo4j');
    } catch (error) {
        console.error('Neo4j connection failed:', error);
        throw error;
    }
};

module.exports = { driver, verifyConnection };

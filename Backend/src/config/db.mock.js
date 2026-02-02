// Mock database connection for testing purposes
// This simulates a successful connection without actually connecting to Neo4j

const verifyConnection = async () => {
    console.log('Mock connection to Neo4j (simulated)');
    return Promise.resolve(); // Simulate successful connection
};

// Mock driver object
const mockDriver = {
    verifyConnectivity: () => Promise.resolve(),
    session: () => ({
        run: () => ({ records: [] }),
        close: () => {}
    }),
    close: () => {}
};

module.exports = { driver: mockDriver, verifyConnection };
let dummyData = null;

async function loadDummyData() {
  try {
    const response = await fetch('../data/dummy-data.json');
    dummyData = await response.json();
    console.log('Dummy data loaded successfully', dummyData);
    return dummyData;
  } catch (error) {
    console.error('Failed to load dummy data:', error);
    return null;
  }
}

function getDummyData(path) {
  // Helper to get nested data: getDummyData('dashboard.stats')
  return path.split('.').reduce((obj, key) => obj?.[key], dummyData);
}

// Format date helper
function formatDate(dateString) {
  const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
  return new Date(dateString).toLocaleDateString('en-US', options);
}

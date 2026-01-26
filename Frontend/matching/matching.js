const dummyLoaderScript = document.createElement('script');
dummyLoaderScript.src = '../js/dummy-loader.js';
document.head.appendChild(dummyLoaderScript);

const apiScript = document.createElement('script');
apiScript.src = '../js/api-client.js';
document.head.appendChild(apiScript);

async function initMatching() {
  await loadDummyData();
  
  if (!dummyData) {
    console.error('Failed to load dummy data');
    return;
  }

  // Populate navbar
  document.querySelector('.user-name').textContent = dummyData.currentUser.name;

  try {
    // Try to load matches from API
    const matchesResponse = await getMatches();
    const matches = matchesResponse.data || [];

    if (matches.length > 0) {
      const firstMatch = matches[0];
      const matchSection = document.querySelectorAll('.card')[0];
      
      const matchRow = matchSection.querySelector('.match-row');
      matchRow.innerHTML = `
        <div class="user-card">
          <img src="${dummyData.currentUser.avatar}" alt="You">
          <h4>You</h4>
          <p>Want to learn: ${firstMatch.skill}</p>
        </div>
        <span class="arrow">→</span>
        <div class="user-card">
          <img src="${firstMatch.user.avatar}" alt="${firstMatch.user.name}">
          <h4>${firstMatch.user.name}</h4>
          <p>Teaches: ${firstMatch.skill}</p>
          <span class="rating">⭐ ${firstMatch.user.rating}</span>
        </div>
      `;
    }
  } catch (error) {
    console.warn('Failed to load matches from API, using dummy data:', error);

    // Fallback to dummy data
    if (dummyData.matches.length > 0) {
      const firstMatch = dummyData.matches[0];
      const matchSection = document.querySelectorAll('.card')[0];
      
      const matchRow = matchSection.querySelector('.match-row');
      matchRow.innerHTML = `
        <div class="user-card">
          <img src="${dummyData.currentUser.avatar}" alt="You">
          <h4>You</h4>
          <p>Want to learn: ${firstMatch.skill}</p>
        </div>
        <span class="arrow">→</span>
        <div class="user-card">
          <img src="${firstMatch.user.avatar}" alt="${firstMatch.user.name}">
          <h4>${firstMatch.user.name}</h4>
          <p>Teaches: ${firstMatch.skill}</p>
          <span class="rating">⭐ ${firstMatch.user.rating}</span>
        </div>
      `;
    }
  }

  // Add button listeners
  document.querySelectorAll('.btn').forEach(btn => {
    btn.addEventListener('click', () => {
      alert('Match action confirmed — backend integration coming next.');
    });
  });
}

document.querySelector(".logout-btn").addEventListener('click', () => {
  alert("Logout clicked");
});

window.addEventListener('load', initMatching);

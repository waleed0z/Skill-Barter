// Load dummy data first
const dummyLoaderScript = document.createElement('script');
dummyLoaderScript.src = '../js/dummy-loader.js';
document.head.appendChild(dummyLoaderScript);

async function initDashboard() {
  await loadDummyData();
  
  if (!dummyData) {
    console.error('Failed to load dummy data');
    return;
  }

  // Populate navbar
  document.querySelector('.user-name').textContent = dummyData.currentUser.name;

  // Update welcome message
  document.querySelector('.dashboard h1').textContent = `Welcome, ${dummyData.currentUser.name}!`;

  // Update time credits
  document.querySelector('.credits').textContent = dummyData.currentUser.timeCredits;

  // Populate teach skills
  const teachSkillsContainer = document.querySelectorAll('.card')[1].querySelector('.skills');
  teachSkillsContainer.innerHTML = dummyData.skills.teaching
    .map(skill => `<span class="skill">${skill.name}</span>`)
    .join('');

  // Populate learn skills
  const learnSkillsContainer = document.querySelectorAll('.card')[2].querySelector('.skills');
  learnSkillsContainer.innerHTML = dummyData.skills.learning
    .map(skill => `<span class="skill learn">${skill.name}</span>`)
    .join('');

  // Populate upcoming session
  if (dummyData.dashboard.upcomingSessions.length > 0) {
    const session = dummyData.dashboard.upcomingSessions[0];
    const sessionInfo = document.querySelector('.session-info');
    const sessionDate = new Date(session.dateTime);
    const formattedDate = sessionDate.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    
    sessionInfo.innerHTML = `
      <img src="${session.partnerAvatar}" alt="${session.partner}">
      <div>
        <p class="session-title">${session.skill} with ${session.partner}</p>
        <p class="session-time">${formattedDate}</p>
      </div>
    `;
  }

  // Populate recent activity
  const activityList = document.querySelector('.activity-list');
  activityList.innerHTML = dummyData.dashboard.recentActivity
    .map(activity => {
      const icon = activity.type === 'session_completed' ? '⭐' : '📅';
      const text = activity.type === 'session_completed' 
        ? `Earned 1 Time Credit from ${activity.partner}` 
        : `Booked ${activity.skill} with ${activity.partner}`;
      return `<li>${icon} ${text} <span>${new Date(activity.date).toLocaleDateString()}</span></li>`;
    })
    .join('');
}

window.addEventListener('load', initDashboard);

const dummyLoaderScript = document.createElement('script');
dummyLoaderScript.src = '../js/dummy-loader.js';
document.head.appendChild(dummyLoaderScript);

const endBtn = document.getElementById("endSessionBtn");
const modal = document.getElementById("ratingModal");
const stars = document.querySelectorAll(".stars span");
let selectedRating = 0;

async function initSession() {
  await loadDummyData();
  
  if (!dummyData) {
    console.error('Failed to load dummy data');
    return;
  }

  // Populate navbar
  document.querySelector('.user-name').textContent = dummyData.currentUser.name;

  // Populate session details
  const session = dummyData.session;
  const sessionHeader = document.querySelector('.session-header');
  
  sessionHeader.innerHTML = `
    <h1>Live Session</h1>
    <p class="subtitle">${session.skill.name} with ${session.teacher.name}</p>
  `;

  // Populate session info
  const sessionInfoList = document.querySelector('.session-info ul');
  sessionInfoList.innerHTML = `
    <li><strong>Skill:</strong> ${session.skill.name}</li>
    <li><strong>Teacher:</strong> ${session.teacher.name}</li>
    <li><strong>Duration:</strong> ${session.duration} Minutes</li>
    <li><strong>Credits:</strong> ${session.creditsRequired} Time Credit</li>
  `;

  // Initialize Jitsi Meet
  initJitsi(session.jitsiRoom);
}

endBtn.addEventListener('click', () => {
  modal.classList.remove("hidden");
});

stars.forEach(star => {
  star.addEventListener('click', () => {
    selectedRating = star.dataset.value;
    stars.forEach(s => s.classList.remove("selected"));
    star.classList.add("selected");
    for (let i = 0; i < selectedRating; i++) {
      stars[i].classList.add("selected");
    }
  });
});

document.getElementById("submitRating").addEventListener('click', () => {
  if (!selectedRating) {
    alert("Please select a rating.");
    return;
  }

  alert("Rating submitted. Credits updated (backend later).");
  modal.classList.add("hidden");
});

// Jitsi Meet Integration
function initJitsi(roomName) {
  const domain = 'meet.jit.si';
  const options = {
    roomName: roomName,
    parentNode: document.querySelector('#jitsi-container'),
    configOverwrite: {
      // Configuration options
      prejoinPageEnabled: false,
      disableSimulcast: false
    },
    interfaceConfigOverwrite: {
      // UI options
      DEFAULT_BACKGROUND: '#000',
      MOBILE_APP_PROMO: false,
      SHOW_JITSI_WATERMARK: true,
      JITSI_WATERMARK_LINK: 'https://jitsi.org'
    },
    onload: onJitsiIframeReady
  };

  const jitsi = new window.JitsiMeetExternalAPI(domain, options);

  // Listen for events
  jitsi.addEventListener('videoConferenceJoined', () => {
    console.log('User joined video conference');
  });

  jitsi.addEventListener('videoConferenceLockStatusChanged', (data) => {
    console.log('Lock status changed:', data);
  });

  jitsi.addEventListener('participantJoined', (data) => {
    console.log('Participant joined:', data);
  });

  jitsi.addEventListener('participantLeft', (data) => {
    console.log('Participant left:', data);
  });

  return jitsi;
}

function onJitsiIframeReady() {
  console.log('Jitsi iframe is ready');
}

window.addEventListener('load', initSession);

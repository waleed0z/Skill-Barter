const dummyLoaderScript = document.createElement('script');
dummyLoaderScript.src = '../js/dummy-loader.js';
document.head.appendChild(dummyLoaderScript);

async function initSkills() {
  await loadDummyData();
  
  if (!dummyData) {
    console.error('Failed to load dummy data');
    return;
  }

  // Populate navbar
  document.querySelector('.user-name').textContent = dummyData.currentUser.name;

  // Populate teach skills
  const teachSkillsList = document.getElementById('teachSkills');
  teachSkillsList.innerHTML = dummyData.skills.teaching
    .map(skill => `<span class="skill" title="${skill.description}">${skill.name}</span>`)
    .join('');

  // Populate learn skills
  const learnSkillsList = document.getElementById('learnSkills');
  learnSkillsList.innerHTML = dummyData.skills.learning
    .map(skill => `<span class="skill learn" title="${skill.description}">${skill.name}</span>`)
    .join('');
}

function addSkill(inputId, listId, className = "") {
  const input = document.getElementById(inputId);
  const list = document.getElementById(listId);

  if (!input.value.trim()) return;

  const skill = document.createElement("span");
  skill.className = `skill ${className}`;
  skill.textContent = input.value.trim();

  list.appendChild(skill);
  input.value = "";
}

document.getElementById("addTeachSkill").addEventListener("click", () => {
  addSkill("teachInput", "teachSkills");
});

document.getElementById("addLearnSkill").addEventListener("click", () => {
  addSkill("learnInput", "learnSkills", "learn");
});

document.querySelector(".logout-btn").addEventListener("click", () => {
  alert("Logout — backend hookup later");
});

window.addEventListener('load', initSkills);

const dummyLoaderScript = document.createElement('script');
dummyLoaderScript.src = '../js/dummy-loader.js';
document.head.appendChild(dummyLoaderScript);

const apiScript = document.createElement('script');
apiScript.src = '../js/api-client.js';
document.head.appendChild(apiScript);

async function initSkills() {
  await loadDummyData();
  
  if (!dummyData) {
    console.error('Failed to load dummy data');
    return;
  }

  // Populate navbar
  document.querySelector('.user-name').textContent = dummyData.currentUser.name;

  // Try to load skills from API, fallback to dummy data
  try {
    const teachingSkills = await getTeachingSkills();
    const learningSkills = await getLearningSkills();
    
    const teachSkillsList = document.getElementById('teachSkills');
    teachSkillsList.innerHTML = (teachingSkills.data || [])
      .map(skill => `<span class="skill" title="${skill.description || ''}">${skill.name}</span>`)
      .join('');

    const learnSkillsList = document.getElementById('learnSkills');
    learnSkillsList.innerHTML = (learningSkills.data || [])
      .map(skill => `<span class="skill learn" title="${skill.description || ''}">${skill.name}</span>`)
      .join('');
  } catch (error) {
    console.warn('Failed to load skills from API, using dummy data:', error);
    
    // Fallback to dummy data
    const teachSkillsList = document.getElementById('teachSkills');
    teachSkillsList.innerHTML = dummyData.skills.teaching
      .map(skill => `<span class="skill" title="${skill.description}">${skill.name}</span>`)
      .join('');

    const learnSkillsList = document.getElementById('learnSkills');
    learnSkillsList.innerHTML = dummyData.skills.learning
      .map(skill => `<span class="skill learn" title="${skill.description}">${skill.name}</span>`)
      .join('');
  }
}

function addSkillToUI(inputId, listId, className = "") {
  const input = document.getElementById(inputId);
  const list = document.getElementById(listId);

  if (!input.value.trim()) return;

  const skillName = input.value.trim();
  const skillType = inputId === "teachInput" ? "TEACH" : "LEARN";

  // Add to UI immediately (optimistic update)
  const skill = document.createElement("span");
  skill.className = `skill ${className}`;
  skill.textContent = skillName;
  list.appendChild(skill);
  input.value = "";

  // Send to API
  // collect optional course fields when adding teach skills
  const options = {};
  if (inputId === 'teachInput') {
    const isCourse = document.getElementById('teachIsCourse')?.checked || false;
    const totalSessions = parseInt(document.getElementById('teachTotalSessions')?.value) || undefined;
    const paymentPlan = document.getElementById('teachPaymentPlan')?.value || undefined;
    if (isCourse) {
      options.isCourse = true;
      if (totalSessions) options.totalSessions = totalSessions;
      if (paymentPlan) options.paymentPlan = paymentPlan;
    }
  }

  addSkill(skillName, skillType, options)
    .then(() => console.log(`Skill "${skillName}" added successfully`))
    .catch(error => {
      console.error(`Failed to add skill "${skillName}":`, error);
      // Remove from UI if API call fails
      skill.remove();
      alert(`Failed to add skill: ${error.message}`);
    });
}

document.getElementById("addTeachSkill").addEventListener("click", () => {
  addSkillToUI("teachInput", "teachSkills");
});

document.getElementById("addLearnSkill").addEventListener("click", () => {
  addSkillToUI("learnInput", "learnSkills", "learn");
});

document.querySelector(".logout-btn").addEventListener("click", () => {
  alert("Logout — backend hookup later");
});

window.addEventListener('load', initSkills);

// Show/hide course-specific inputs when checkbox toggled
const teachIsCourseCheckbox = document.getElementById('teachIsCourse');
if (teachIsCourseCheckbox) {
  teachIsCourseCheckbox.addEventListener('change', (e) => {
    const show = e.target.checked;
    const totalInput = document.getElementById('teachTotalSessions');
    const planSelect = document.getElementById('teachPaymentPlan');
    if (totalInput) totalInput.style.display = show ? 'inline-block' : 'none';
    if (planSelect) planSelect.style.display = show ? 'inline-block' : 'none';
  });
}

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

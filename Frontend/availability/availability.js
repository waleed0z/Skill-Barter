const calendarGrid = document.querySelector(".calendar-grid");
const monthLabel = document.getElementById("monthLabel");

let currentDate = new Date(2026, 0, 1);
let selectedDate = null;

function renderCalendar() {
  calendarGrid.querySelectorAll(".date").forEach(d => d.remove());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  monthLabel.textContent = currentDate.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric"
  });

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  for (let i = 0; i < firstDay; i++) {
    calendarGrid.appendChild(document.createElement("div"));
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dateEl = document.createElement("div");
    dateEl.className = "date";
    dateEl.textContent = day;

    dateEl.onclick = () => {
      document.querySelectorAll(".date").forEach(d => d.classList.remove("selected"));
      dateEl.classList.add("selected");
      selectedDate = new Date(year, month, day);
    };

    calendarGrid.appendChild(dateEl);
  }
}

renderCalendar();

document.getElementById("prevMonth").onclick = () => {
  currentDate.setMonth(currentDate.getMonth() - 1);
  renderCalendar();
};

document.getElementById("nextMonth").onclick = () => {
  currentDate.setMonth(currentDate.getMonth() + 1);
  renderCalendar();
};

document.querySelectorAll(".slot").forEach(slot => {
  slot.onclick = () => slot.classList.toggle("selected");
});

document.querySelector(".save-btn").onclick = () => {
  if (!selectedDate) {
    alert("Please select a date first.");
    return;
  }
  alert("Availability saved (connect backend later)");
};

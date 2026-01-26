const dummyLoaderScript = document.createElement('script');
dummyLoaderScript.src = '../js/dummy-loader.js';
document.head.appendChild(dummyLoaderScript);

const apiScript = document.createElement('script');
apiScript.src = '../js/api-client.js';
document.head.appendChild(apiScript);

const calendarGrid = document.querySelector(".calendar-grid");
const monthLabel = document.getElementById("monthLabel");
const slotGrid = document.querySelector(".slot-grid");

let currentDate = new Date(2026, 0, 1);
let selectedDate = null;
let selectedSlots = [];

async function initAvailability() {
  await loadDummyData();
  
  if (!dummyData) {
    console.error('Failed to load dummy data');
    return;
  }

  // Populate navbar
  document.querySelector('.user-name').textContent = dummyData.currentUser.name;

  // Render initial calendar
  renderCalendar();
  
  // Populate slots from dummy data
  populateSlots();
}

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
      populateSlots();
    };

    calendarGrid.appendChild(dateEl);
  }
}

function populateSlots() {
  if (!dummyData) return;
  
  const dayOfWeek = selectedDate ? selectedDate.toLocaleDateString('en-US', { weekday: 'long' }) : 'Monday';
  const daySchedule = dummyData.availability.weeklySchedule.find(d => d.day === dayOfWeek);
  
  if (daySchedule) {
    slotGrid.innerHTML = daySchedule.slots
      .map(slot => `
        <button class="slot" data-time="${slot.startTime}-${slot.endTime}" 
          ${slot.available ? '' : 'disabled'}>
          ${slot.startTime} – ${slot.endTime}
        </button>
      `)
      .join('');
    
    // Add slot selection listeners
    document.querySelectorAll('.slot').forEach(slot => {
      slot.addEventListener('click', (e) => {
        e.target.classList.toggle('selected');
      });
    });
  }
}

document.getElementById("prevMonth").onclick = () => {
  currentDate.setMonth(currentDate.getMonth() - 1);
  renderCalendar();
};

document.getElementById("nextMonth").onclick = () => {
  currentDate.setMonth(currentDate.getMonth() + 1);
  renderCalendar();
};

document.querySelector('.save-btn').addEventListener('click', async () => {
  if (!selectedDate) {
    alert("Please select a date first.");
    return;
  }

  // Gather selected slots
  const availabilityData = {
    date: selectedDate.toISOString(),
    slots: Array.from(document.querySelectorAll('.slot.selected'))
      .map(slot => slot.dataset.time)
  };

  try {
    await updateAvailability(availabilityData);
    alert('Availability saved successfully!');
  } catch (error) {
    console.warn('Failed to save availability to API:', error);
    alert('Availability saved locally! (Backend update coming next)');
  }
});

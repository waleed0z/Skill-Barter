const endBtn = document.getElementById("endSessionBtn");
const modal = document.getElementById("ratingModal");
const stars = document.querySelectorAll(".stars span");
let selectedRating = 0;

endBtn.onclick = () => {
  modal.classList.remove("hidden");
};

stars.forEach(star => {
  star.onclick = () => {
    selectedRating = star.dataset.value;
    stars.forEach(s => s.classList.remove("selected"));
    star.classList.add("selected");
    for (let i = 0; i < selectedRating; i++) {
      stars[i].classList.add("selected");
    }
  };
});

document.getElementById("submitRating").onclick = () => {
  if (!selectedRating) {
    alert("Please select a rating.");
    return;
  }

  alert("Rating submitted. Credits updated (backend later).");
  modal.classList.add("hidden");
};

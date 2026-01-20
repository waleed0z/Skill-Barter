document.querySelectorAll(".btn").forEach(btn => {
  btn.onclick = () => {
    alert("Action confirmed — backend integration coming next.");
  };
});

document.querySelector(".logout-btn").onclick = () => {
  alert("Logout clicked");
};

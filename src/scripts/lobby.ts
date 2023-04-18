const form = document.getElementById("lobby__form");
let displayName = localStorage.getItem("display_name");
if (displayName) {
  (form as any).name.value = displayName;
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  localStorage.setItem("display_name", (event.target as any).name.value);
  let inviteCode = (event.target as any).room.value;
  if (!inviteCode) {
    inviteCode = String(Math.round(Math.random() * 10000));
  }
  window.location = `/room?room=${inviteCode}` as any;
});

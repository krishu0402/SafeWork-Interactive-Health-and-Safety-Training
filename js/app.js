function workerLogin() {
  document.getElementById("login").classList.add("hidden");
  document.getElementById("app").classList.remove("hidden");
  page("dashboard");
}

function workerLogout() {
  document.getElementById("app").classList.add("hidden");
  document.getElementById("login").classList.remove("hidden");
}

function staffLogin() {
  var role = document.getElementById("role").value;
  document.getElementById("login").classList.add("hidden");
  document.getElementById("app").classList.remove("hidden");
  document.getElementById("roleText").textContent =
    role === "admin" ? "Administrator" : "Supervisor";
  page("overview");
}

function staffLogout() {
  document.getElementById("app").classList.add("hidden");
  document.getElementById("login").classList.remove("hidden");
}

function page(id) {
  document.querySelectorAll(".page").forEach(function (el) {
    el.classList.add("hidden");
  });
  var target = document.getElementById(id);
  if (target) target.classList.remove("hidden");
  document.querySelectorAll(".side button[data-p]").forEach(function (btn) {
    btn.classList.toggle("active", btn.dataset.p === id);
  });
}

function answer(ok) {
  var f = document.getElementById("feedback");
  var next = document.getElementById("next");
  f.classList.remove("hidden");
  f.className = "feedback " + (ok ? "good" : "bad");
  f.innerHTML = ok
    ? "<b>✓ Correct</b><br>Assess the load first and use an appropriate lifting technique."
    : "<b>✕ Not quite</b><br>This action may increase the risk of injury. Choose the safest manual-handling approach.";
  if (next) next.classList.remove("hidden");
}

function coming(message) {
  var toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.remove("hidden");
  clearTimeout(coming._t);
  coming._t = setTimeout(function () {
    toast.classList.add("hidden");
  }, 4200);
}

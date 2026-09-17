var DB_KEY = "safework_demo_v1";
var PASS_MARK = 70; 

var MODULES = {
  "manual-handling": {
    name: "Manual Handling",
    desc: "Hazard awareness, safe lifting and decisions",
    built: true,
    scene: {
      label: "INBOUND AISLE · GOODS-IN",
      html:
        '<div class="rack"></div><div class="box b1"></div><div class="box b2"></div><div class="box b3"></div><div class="worker">👷</div>',
      hotspots: [
        { id: "cable", x: "10%", y: "76%", hazard: true, label: "Trailing cable across the walkway" },
        { id: "puddle", x: "55%", y: "82%", hazard: true, label: "Wet floor patch near the racking" },
        { id: "extinguisher", x: "88%", y: "40%", hazard: false, label: "Fire extinguisher — correctly mounted, not a hazard" }
      ]
    },
    questions: [
      {
        q: "What should you do before lifting this load?",
        options: [
          "Lift immediately using the back",
          "Assess the load and use the correct lifting technique",
          "Twist while lifting to save time",
          "Carry the load above shoulder height"
        ],
        correct: 1,
        explain: "Assess the load first and use an appropriate lifting technique."
      },
      {
        q: "You notice a trailing cable across the walkway near your task. What's the safest action?",
        options: [
          "Step over it carefully and carry on",
          "Report it and cordon the area, or use another route",
          "Kick it aside",
          "Ignore it — someone else will deal with it"
        ],
        correct: 1,
        explain: "Trip hazards should be reported and isolated, not stepped over or ignored."
      },
      {
        q: "Your trolley is overloaded and hard to control. What should you do?",
        options: [
          "Push it faster to get it over with",
          "Reduce the load or get help before moving it",
          "Let it roll and steer at the last second",
          "Remove the wheel brake to save time"
        ],
        correct: 1,
        explain: "An unstable load should be reduced or moved with help, not rushed."
      },
      {
        q: "Which posture reduces the risk of back injury when lifting?",
        options: [
          "Bend at the waist with straight legs",
          "Keep the load close, bend the knees, keep your back straight",
          "Twist your torso while holding the load",
          "Lift quickly to reduce time under load"
        ],
        correct: 1,
        explain: "Bending the knees and keeping the load close protects the spine."
      }
    ]
  },
  "hazard-awareness": {
    name: "Hazard Awareness",
    desc: "Spot hazards early and choose the correct response",
    built: true,
    scene: {
      label: "PUT-AWAY / RACKING BAY",
      html:
        '<div class="rack" style="height:260px;top:40px"></div><div class="box b1" style="bottom:200px"></div><div class="worker">🦺</div>',
      hotspots: [
        { id: "box-high", x: "62%", y: "22%", hazard: true, label: "Unsecured box on a high shelf, overhanging the aisle" },
        { id: "puddle2", x: "22%", y: "80%", hazard: true, label: "Spill in the forklift lane" },
        { id: "sign", x: "8%", y: "18%", hazard: false, label: "Warehouse safety signage — correctly displayed" }
      ]
    },
    questions: [
      {
        q: "You spot an unsecured box on a high shelf that could fall into a walkway. What do you do first?",
        options: [
          "Ignore it — not your job",
          "Report it to your supervisor and cordon the area",
          "Climb up and try to fix it yourself",
          "Walk underneath quickly before anyone notices"
        ],
        correct: 1,
        explain: "Report and isolate the hazard — don't attempt an unsafe fix yourself."
      },
      {
        q: "Which is a good hazard-awareness habit at the start of a shift?",
        options: [
          "Walk your work area and note any new hazards",
          "Assume yesterday's hazards are already gone",
          "Skip PPE if you're in a rush",
          "Only report hazards at the end of the week"
        ],
        correct: 0,
        explain: "A quick area check at shift start catches hazards before they cause harm."
      },
      {
        q: "You notice a colleague not wearing required PPE in a marked zone. What should you do?",
        options: [
          "Say nothing — it's their choice",
          "Politely remind them, and report it if it continues",
          "Post about it on social media",
          "Do the same to save time"
        ],
        correct: 1,
        explain: "A friendly reminder first, with escalation if it continues, keeps everyone safe."
      },
      {
        q: "A near-miss happened but no one was hurt. What is the correct action?",
        options: [
          "No action needed since nobody was hurt",
          "Report it so the hazard can be fixed before someone is hurt",
          "Only report it if a manager saw it",
          "Wait until the next audit"
        ],
        correct: 1,
        explain: "Near-misses are reported so the underlying hazard gets fixed before it causes real harm."
      }
    ]
  },
  "ppe": { name: "Personal Protective Equipment", desc: "PPE selection, inspection and use", built: false },
  "fire-safety": { name: "Fire Safety", desc: "Emergency response and evacuation", built: false }
};

var MODULE_ORDER = ["manual-handling", "hazard-awareness", "ppe", "fire-safety"];

/* ---------- Persistence ---------- */
function defaultState() {
  var progress = {};
  MODULE_ORDER.forEach(function (id) {
    progress[id] = { status: "not-started", score: null, completedAt: null };
  });
  return {
    worker: { name: "Alex Kumar", email: "alex.kumar@northgate-logistics.com", shift: "Inbound / receiving" },
    progress: progress,
    skill: { attempts: 0, best: 0, last: null },
    people: [
      { name: "Alex Kumar", email: "alex.kumar@northgate-logistics.com", password: "safework", role: "Worker", assigned: "Manual Handling, Hazard Awareness", note: "Demo account — full progress tracked live", due: "—" },
      { name: "Sam Patel", email: "sam.patel@northgate-logistics.com", password: "welcome1", role: "Worker", assigned: "Manual Handling", note: "Training due", due: "Overdue" },
      { name: "Riley Chen", email: "riley.chen@northgate-logistics.com", password: "welcome1", role: "Worker", assigned: "Manual Handling", note: "Forklift complete", due: "—" },
      { name: "Jordan Lee", email: "jordan.lee@northgate-logistics.com", password: null, role: "Supervisor", assigned: "—", note: "Staff account", due: "—" }
    ]
  };
}

function loadState() {
  try {
    var raw = localStorage.getItem(DB_KEY);
    if (!raw) { var s = defaultState(); saveState(s); return s; }
    var parsed = JSON.parse(raw);
    MODULE_ORDER.forEach(function (id) {
      if (!parsed.progress[id]) parsed.progress[id] = { status: "not-started", score: null, completedAt: null };
    });
    if (!parsed.skill) parsed.skill = { attempts: 0, best: 0, last: null };
    return parsed;
  } catch (e) {
    var s2 = defaultState(); saveState(s2); return s2;
  }
}
function saveState(s) { localStorage.setItem(DB_KEY, JSON.stringify(s)); }
function resetDemo() { localStorage.removeItem(DB_KEY); location.reload(); }

var STATE = loadState();
var CURRENT_MODULE = null;
var FOUND = [];
var ANSWERS = [];
var QINDEX = 0;

/* ---------- Worker auth ---------- */
function workerLogin() {
  var email = document.getElementById("w-email").value.trim();
  var pass = document.getElementById("w-pass").value.trim();
  var ok = true;
  var emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  document.getElementById("w-email").classList.toggle("err", !emailOk);
  document.getElementById("w-email-err").textContent = emailOk ? "" : "Enter a valid work email address.";
  if (!emailOk) ok = false;
  document.getElementById("w-pass").classList.toggle("err", pass.length < 4);
  document.getElementById("w-pass-err").textContent = pass.length < 4 ? "Password must be at least 4 characters." : "";
  if (pass.length < 4) ok = false;
  if (!ok) return;
  var account = STATE.people.filter(function (p) {
    return p.role === "Worker" && p.email && p.email.toLowerCase() === email.toLowerCase() && p.password === pass;
  })[0];
  if (!account) {
    document.getElementById("w-pass").classList.add("err");
    document.getElementById("w-pass-err").textContent = "No worker account matches that email and password. Ask your supervisor to create one, or use the demo account shown by default.";
    return;
  }
  STATE.worker = { name: account.name, email: account.email, shift: STATE.worker.shift || "Warehouse floor" };
  saveState(STATE);
  document.getElementById("login").classList.add("hidden");
  document.getElementById("app").classList.remove("hidden");
  page("dashboard");
}
function workerLogout() {
  document.getElementById("app").classList.add("hidden");
  document.getElementById("login").classList.remove("hidden");
}

/* ---------- Staff auth ---------- */
function staffLogin() {
  var role = document.getElementById("role").value;
  var email = document.getElementById("a-email").value.trim();
  var emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  document.getElementById("a-email").classList.toggle("err", !emailOk);
  document.getElementById("a-email-err").textContent = emailOk ? "" : "Enter a valid work email address.";
  if (!emailOk) return;
  document.getElementById("login").classList.add("hidden");
  document.getElementById("app").classList.remove("hidden");
  document.getElementById("roleText").textContent = role === "admin" ? "Administrator" : "Supervisor";
  page("overview");
  renderAdmin();
}
function staffLogout() {
  document.getElementById("app").classList.add("hidden");
  document.getElementById("login").classList.remove("hidden");
}

/* ---------- Navigation ---------- */
function page(id) {
  document.querySelectorAll(".page").forEach(function (el) { el.classList.add("hidden"); });
  var target = document.getElementById(id);
  if (target) target.classList.remove("hidden");
  document.querySelectorAll(".side button[data-p]").forEach(function (btn) {
    btn.classList.toggle("active", btn.dataset.p === id);
  });
  if (id === "dashboard") renderDashboard();
  if (id === "training") renderTraining();
  if (id === "progress") renderProgress();
  if (id === "reminders") renderReminders();
}
function coming(message) {
  var toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.remove("hidden");
  clearTimeout(coming._t);
  coming._t = setTimeout(function () { toast.classList.add("hidden"); }, 4200);
}

/* ---------- Dashboard (FR08 — real, computed) ---------- */
function computeStats() {
  var ids = MODULE_ORDER;
  var built = ids.filter(function (i) { return MODULES[i].built; });
  var completed = built.filter(function (i) { return STATE.progress[i].status === "completed"; });
  var scores = completed.map(function (i) { return STATE.progress[i].score; });
  var avg = scores.length ? Math.round(scores.reduce(function (a, b) { return a + b; }, 0) / scores.length) : 0;
  var overallPct = Math.round((completed.length / ids.length) * 100);
  return { completed: completed.length, total: ids.length, avg: avg, overallPct: overallPct };
}
function renderDashboard() {
  var s = computeStats();
  var firstName = STATE.worker.name.split(" ")[0];
  var greet = document.getElementById("d-greet");
  if (greet) greet.textContent = "Good morning, " + firstName;
  var who = document.getElementById("whoHeader");
  if (who) who.textContent = STATE.worker.name + " · " + (STATE.worker.shift || "Warehouse floor");
  document.getElementById("d-overall").textContent = s.overallPct + "%";
  document.getElementById("d-modules").textContent = s.completed + " / " + s.total;
  document.getElementById("d-lastscore").textContent = s.avg ? s.avg + "%" : "—";
  document.getElementById("d-due").textContent = dueModules().length;
  var skillEl = document.getElementById("d-skill");
  if (skillEl) skillEl.textContent = STATE.skill.attempts ? STATE.skill.best + "%" : "—";
}
function dueModules() {
  return MODULE_ORDER.filter(function (id) {
    return MODULES[id].built && STATE.progress[id].status !== "completed";
  });
}

/* ---------- Training list (FR03) ---------- */
function renderTraining() {
  var wrap = document.getElementById("training-list");
  wrap.innerHTML = "";
  MODULE_ORDER.forEach(function (id) {
    var m = MODULES[id];
    var p = STATE.progress[id];
    var row = document.createElement("div");
    row.className = "module";
    var statusPill = p.status === "completed"
      ? '<span class="pill ok">Completed · ' + p.score + "%</span>"
      : (m.built ? '<span class="pill warn">Ready</span>' : '<span class="pill lock">Coming soon</span>');
    row.innerHTML =
      "<div><h3>" + m.name + " " + statusPill + '</h3><p>' + m.desc + "</p></div>";
    var btn = document.createElement("button");
    if (m.built) {
      btn.className = "btn btn-primary";
      btn.textContent = p.status === "completed" ? "Review" : "Open";
      btn.onclick = function () { startModule(id); };
    } else {
      btn.className = "btn btn-secondary";
      btn.textContent = "Coming soon";
      btn.onclick = function () { coming(m.name + " is scheduled for a later release. Manual Handling and Hazard Awareness are available now."); };
    }
    row.appendChild(btn);
    wrap.appendChild(row);
  });
}

/* ---------- Module flow: intro -> hotspot -> quiz -> result (FR04-FR07) ---------- */
function startModule(id) {
  CURRENT_MODULE = id; FOUND = []; ANSWERS = []; QINDEX = 0;
  page("module");
  renderIntro();
}
function setStep(n) {
  ["s1", "s2", "s3", "s4"].forEach(function (sid, i) {
    var el = document.getElementById(sid);
    el.classList.remove("on", "done");
    if (i + 1 < n) el.classList.add("done");
    if (i + 1 === n) el.classList.add("on");
  });
}
function renderIntro() {
  setStep(1);
  var m = MODULES[CURRENT_MODULE];
  document.getElementById("module-body").innerHTML =
    '<div class="card"><h1 class="title">' + m.name + '</h1><p class="sub">' + m.desc + '</p>' +
    '<p>You will spot the hazards in the scene, then answer ' + m.questions.length + ' scenario questions. A score of ' + PASS_MARK + '%+ passes (provisional threshold, pending client confirmation).</p>' +
    '<button class="btn btn-primary" onclick="renderHotspot()">Start</button> ' +
    '<button class="btn btn-ghost" onclick="page(\'training\')">Back to training</button></div>';
}
function renderHotspot() {
  setStep(2);
  var m = MODULES[CURRENT_MODULE];
  var pins = m.scene.hotspots.map(function (h, i) {
    return '<button class="hotspot" style="left:' + h.x + ';top:' + h.y + '" onclick="clickHotspot(' + i + ')" id="hs' + i + '">' + (i + 1) + "</button>";
  }).join("");
  document.getElementById("module-body").innerHTML =
    '<div class="scenario"><div class="scene"><div class="scene-label">' + m.scene.label + "</div>" +
    m.scene.html + pins + '</div><div class="card">' +
    '<span class="pill">Find the hazards</span><h2>Click each numbered point in the scene</h2>' +
    "<p class=\"sub\">Some points are hazards, some are safe items placed to test your judgement.</p>" +
    '<div id="hs-feedback"></div>' +
    '<button id="hs-continue" class="btn btn-primary hidden" style="margin-top:10px" onclick="renderQuiz()">Continue to assessment</button>' +
    "</div></div>";
}
function clickHotspot(i) {
  var m = MODULES[CURRENT_MODULE];
  var h = m.scene.hotspots[i];
  var btn = document.getElementById("hs" + i);
  if (FOUND.indexOf(i) === -1) FOUND.push(i);
  btn.classList.add("found");
  if (!h.hazard) btn.classList.add("safe");
  var fb = document.getElementById("hs-feedback");
  var row = document.createElement("div");
  row.className = "feedback " + (h.hazard ? "bad" : "good");
  row.innerHTML = "<b>" + (i + 1) + ". " + (h.hazard ? "Hazard identified" : "Not a hazard") + "</b><br>" + h.label;
  fb.appendChild(row);
  var hazardsTotal = m.scene.hotspots.filter(function (x) { return x.hazard; }).length;
  var hazardsFound = FOUND.filter(function (idx) { return m.scene.hotspots[idx].hazard; }).length;
  if (hazardsFound >= hazardsTotal) document.getElementById("hs-continue").classList.remove("hidden");
}
function renderQuiz() {
  setStep(3);
  QINDEX = 0; ANSWERS = [];
  showQuestion();
}
function showQuestion() {
  var m = MODULES[CURRENT_MODULE];
  var q = m.questions[QINDEX];
  var opts = q.options.map(function (opt, i) {
    return '<button class="choice" id="opt' + i + '" onclick="selectAnswer(' + i + ')">' + String.fromCharCode(65 + i) + ". " + opt + "</button>";
  }).join("");
  document.getElementById("module-body").innerHTML =
    '<div class="card" style="max-width:640px;margin:0 auto"><span class="pill">Question ' + (QINDEX + 1) + " of " + m.questions.length + '</span>' +
    "<h2>" + q.q + "</h2>" + opts +
    '<div id="q-feedback"></div>' +
    '<button id="q-next" class="btn btn-primary hidden" style="margin-top:10px" onclick="nextQuestion()">' +
    (QINDEX + 1 < m.questions.length ? "Next question" : "See my result") + "</button></div>";
}
function selectAnswer(i) {
  var m = MODULES[CURRENT_MODULE];
  var q = m.questions[QINDEX];
  if (ANSWERS[QINDEX] !== undefined) return; // already answered
  ANSWERS[QINDEX] = i;
  document.querySelectorAll(".choice").forEach(function (b, idx) {
    b.setAttribute("disabled", "true");
    if (idx === q.correct) b.classList.add("correct");
    if (idx === i && i !== q.correct) b.classList.add("wrong");
  });
  var fb = document.getElementById("q-feedback");
  fb.className = "feedback " + (i === q.correct ? "good" : "bad");
  fb.innerHTML = "<b>" + (i === q.correct ? "✓ Correct" : "✕ Not quite") + "</b><br>" + q.explain;
  document.getElementById("q-next").classList.remove("hidden");
}
function nextQuestion() {
  var m = MODULES[CURRENT_MODULE];
  if (QINDEX + 1 < m.questions.length) { QINDEX++; showQuestion(); }
  else finishModule();
}
function finishModule() {
  var m = MODULES[CURRENT_MODULE];
  var correct = ANSWERS.filter(function (a, i) { return a === m.questions[i].correct; }).length;
  var score = Math.round((correct / m.questions.length) * 100);
  STATE.progress[CURRENT_MODULE] = { status: "completed", score: score, completedAt: new Date().toISOString() };
  saveState(STATE);
  renderResult(score);
}
function renderResult(score) {
  setStep(4);
  var m = MODULES[CURRENT_MODULE];
  var passed = score >= PASS_MARK;
  document.getElementById("module-body").innerHTML =
    '<div class="card" style="max-width:560px;margin:0 auto;text-align:center">' +
    '<div class="result-badge ' + (passed ? "pass" : "fail") + '">' + score + "%</div>" +
    "<h1 class=\"title\">" + (passed ? "Module passed" : "Not passed yet") + "</h1>" +
    '<p class="sub">' + m.name + " · " + PASS_MARK + "% pass mark (provisional)</p>" +
    (passed
      ? '<button class="btn btn-primary" onclick="showCertificate()">View / download certificate</button> '
      : '<button class="btn btn-primary" onclick="startModule(\'' + CURRENT_MODULE + '\')">Retry module</button> ') +
    '<button class="btn btn-ghost" onclick="page(\'training\')">Back to training</button>' +
    '<div id="cert-slot" style="margin-top:18px"></div></div>';
}

/* ---------- Certificates (FR10 — lightweight, real) ---------- */
function showCertificate() {
  var m = MODULES[CURRENT_MODULE];
  var p = STATE.progress[CURRENT_MODULE];
  var date = new Date(p.completedAt).toLocaleDateString();
  var slot = document.getElementById("cert-slot");
  slot.innerHTML =
    '<div class="cert-preview" id="cert-canvas-holder">' +
    '<div class="kicker">SafeWork · Certificate of Completion</div>' +
    '<div class="cname">' + STATE.worker.name + "</div>" +
    '<div class="cmod">has completed ' + m.name + " with a score of " + p.score + "%</div>" +
    '<div class="cmeta">Issued ' + date + " · SafeTech Solutions · Northgate Logistics</div></div>" +
    '<button class="btn btn-secondary" style="margin-top:12px" onclick="downloadCertificate()">Download certificate (PNG)</button>';
}
function downloadCertificate() {
  var m = MODULES[CURRENT_MODULE];
  var p = STATE.progress[CURRENT_MODULE];
  var c = document.createElement("canvas");
  c.width = 900; c.height = 560;
  var ctx = c.getContext("2d");
  ctx.fillStyle = "#fdfdfd"; ctx.fillRect(0, 0, c.width, c.height);
  ctx.strokeStyle = "#1e1b4b"; ctx.lineWidth = 14; ctx.strokeRect(20, 20, c.width - 40, c.height - 40);
  ctx.textAlign = "center";
  ctx.fillStyle = "#4f46e5"; ctx.font = "700 16px sans-serif";
  ctx.fillText("SAFEWORK · CERTIFICATE OF COMPLETION", c.width / 2, 130);
  ctx.fillStyle = "#1e1b4b"; ctx.font = "800 40px sans-serif";
  ctx.fillText(STATE.worker.name, c.width / 2, 210);
  ctx.fillStyle = "#0f172a"; ctx.font = "400 18px sans-serif";
  ctx.fillText("has completed", c.width / 2, 255);
  ctx.font = "700 24px sans-serif"; ctx.fillStyle = "#4f46e5";
  ctx.fillText(m.name, c.width / 2, 295);
  ctx.fillStyle = "#0f172a"; ctx.font = "400 16px sans-serif";
  ctx.fillText("with a score of " + p.score + "%", c.width / 2, 330);
  ctx.fillStyle = "#64748b"; ctx.font = "400 13px sans-serif";
  ctx.fillText("Issued " + new Date(p.completedAt).toLocaleDateString() + " · SafeTech Solutions · Northgate Logistics", c.width / 2, 480);
  var link = document.createElement("a");
  link.download = "SafeWork-Certificate-" + CURRENT_MODULE + ".png";
  link.href = c.toDataURL("image/png");
  link.click();
}

/* ---------- Worker progress page ---------- */
function renderProgress() {
  var s = computeStats();
  document.getElementById("p-completion").textContent = s.overallPct + "%";
  document.getElementById("p-avg").textContent = s.avg ? s.avg + "%" : "—";
  document.getElementById("p-completed").textContent = s.completed;
  var body = document.getElementById("p-table-body");
  body.innerHTML = "";
  MODULE_ORDER.forEach(function (id) {
    var m = MODULES[id]; var p = STATE.progress[id];
    var statusPill = p.status === "completed"
      ? '<span class="pill ok">Completed</span>'
      : (m.built ? '<span class="pill warn">Not started</span>' : '<span class="pill lock">Not released</span>');
    var tr = document.createElement("tr");
    tr.innerHTML = "<td>" + m.name + "</td><td>" + statusPill + "</td><td>" + (p.status === "completed" ? "100%" : "0%") + "</td><td>" + (p.score !== null ? p.score + "%" : "—") + "</td>";
    body.appendChild(tr);
  });
}

/* ---------- Reminders (FR12 partial — real in-app list; email/SMS still not built) ---------- */
function renderReminders() {
  var wrap = document.getElementById("reminders-list");
  var due = dueModules();
  if (!due.length) {
    wrap.innerHTML = '<div class="card"><p>Nothing due — all released modules are complete. Nice work.</p></div>';
    return;
  }
  wrap.innerHTML = due.map(function (id) {
    var m = MODULES[id];
    return '<div class="module"><div><h3>' + m.name + '</h3><p>Not yet completed</p></div>' +
      '<button class="btn btn-primary" onclick="startModule(\'' + id + '\')">Start now</button></div>';
  }).join("");
}

/* ---------- Skill Refine (mixed-module practice; supports FR08 skill tracking) ---------- */
var SKILL_POOL = [];
var SKILL_ANSWERS = [];
var SKILL_INDEX = 0;
function buildSkillPool() {
  var pool = [];
  MODULE_ORDER.forEach(function (id) {
    var m = MODULES[id];
    if (!m.built) return;
    m.questions.forEach(function (q) { pool.push({ moduleId: id, moduleName: m.name, q: q }); });
  });
  for (var i = pool.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var tmp = pool[i]; pool[i] = pool[j]; pool[j] = tmp;
  }
  return pool.slice(0, 5);
}
function startSkillRefine() {
  SKILL_POOL = buildSkillPool();
  SKILL_ANSWERS = []; SKILL_INDEX = 0;
  page("skill");
  showSkillQuestion();
}
function showSkillQuestion() {
  var item = SKILL_POOL[SKILL_INDEX];
  var q = item.q;
  var opts = q.options.map(function (opt, i) {
    return '<button class="choice" onclick="selectSkillAnswer(' + i + ')">' + String.fromCharCode(65 + i) + ". " + opt + "</button>";
  }).join("");
  document.getElementById("skill-body").innerHTML =
    '<div class="card" style="max-width:640px;margin:0 auto">' +
    '<span class="pill">Practice ' + (SKILL_INDEX + 1) + " of " + SKILL_POOL.length + '</span> <span class="pill">' + item.moduleName + "</span>" +
    "<h2>" + q.q + "</h2>" + opts +
    '<div id="skill-feedback"></div>' +
    '<button id="skill-next" class="btn btn-primary hidden" style="margin-top:10px" onclick="nextSkillQuestion()">' +
    (SKILL_INDEX + 1 < SKILL_POOL.length ? "Next" : "See my skill score") + "</button></div>";
}
function selectSkillAnswer(i) {
  var q = SKILL_POOL[SKILL_INDEX].q;
  if (SKILL_ANSWERS[SKILL_INDEX] !== undefined) return;
  SKILL_ANSWERS[SKILL_INDEX] = i;
  document.querySelectorAll("#skill-body .choice").forEach(function (b, idx) {
    b.setAttribute("disabled", "true");
    if (idx === q.correct) b.classList.add("correct");
    if (idx === i && i !== q.correct) b.classList.add("wrong");
  });
  var fb = document.getElementById("skill-feedback");
  fb.className = "feedback " + (i === q.correct ? "good" : "bad");
  fb.innerHTML = "<b>" + (i === q.correct ? "✓ Correct" : "✕ Not quite") + "</b><br>" + q.explain;
  document.getElementById("skill-next").classList.remove("hidden");
}
function nextSkillQuestion() {
  if (SKILL_INDEX + 1 < SKILL_POOL.length) { SKILL_INDEX++; showSkillQuestion(); }
  else finishSkillRefine();
}
function finishSkillRefine() {
  var correct = SKILL_ANSWERS.filter(function (a, i) { return a === SKILL_POOL[i].q.correct; }).length;
  var score = Math.round((correct / SKILL_POOL.length) * 100);
  STATE.skill.attempts += 1;
  STATE.skill.last = score;
  STATE.skill.best = Math.max(STATE.skill.best, score);
  saveState(STATE);
  document.getElementById("skill-body").innerHTML =
    '<div class="card" style="max-width:560px;margin:0 auto;text-align:center">' +
    '<div class="result-badge ' + (score >= PASS_MARK ? "pass" : "fail") + '">' + score + "%</div>" +
    '<h1 class="title">Skill Refine result</h1>' +
    '<p class="sub">Best so far: ' + STATE.skill.best + "% · Attempts: " + STATE.skill.attempts + '</p>' +
    '<button class="btn btn-primary" onclick="startSkillRefine()">Practice again</button> ' +
    '<button class="btn btn-ghost" onclick="page(\'dashboard\')">Back to dashboard</button></div>';
}

/* ---------- Admin (FR09 partial — real, reads worker's shared state) ---------- */
function renderAdmin() {
  var s = computeStats();
  document.getElementById("a-completion").textContent = s.overallPct + "%";
  var body = document.getElementById("a-people-body");
  if (!body) return;
  body.innerHTML = "";
  STATE.people.forEach(function (p) {
    var tr = document.createElement("tr");
    var live = (p.name === STATE.worker.name) ? ' <span class="pill">Live demo</span>' : "";
    var statusText = p.role !== "Worker" ? p.note
      : (p.name === STATE.worker.name ? statusForWorker() : p.note);
    tr.innerHTML = "<td>" + p.name + live + "</td><td>" + p.role + "</td><td>" + (p.email || "—") + "</td><td>" + statusText + (p.assigned && p.assigned !== "—" ? " · Assigned: " + p.assigned : "") + "</td><td>" + p.due + "</td>";
    body.appendChild(tr);
  });
}
function statusForWorker() {
  var mh = STATE.progress["manual-handling"], ha = STATE.progress["hazard-awareness"];
  return (mh.status === "completed" && ha.status === "completed") ? "All released modules complete"
    : (mh.status === "completed" || ha.status === "completed") ? "In progress" : "Training due";
}
function genPassword() {
  var words = ["safe", "guard", "shift", "track", "secure", "spot"];
  var w = words[Math.floor(Math.random() * words.length)];
  var n = Math.floor(100 + Math.random() * 900);
  return w.charAt(0).toUpperCase() + w.slice(1) + n;
}
function addWorker() {
  var name = document.getElementById("new-worker-name").value.trim();
  var email = document.getElementById("new-worker-email").value.trim();
  if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    coming("Enter a name and a valid work email to add a worker.");
    return;
  }
  if (STATE.people.some(function (p) { return p.email && p.email.toLowerCase() === email.toLowerCase(); })) {
    coming("An account with that email already exists.");
    return;
  }
  var tempPass = genPassword();
  STATE.people.push({ name: name, email: email, password: tempPass, role: "Worker", assigned: "—", note: "Awaiting first sign-in", due: "—" });
  saveState(STATE);
  document.getElementById("new-worker-name").value = "";
  document.getElementById("new-worker-email").value = "";
  renderAdmin();
  coming(name + " added. Temporary login — email: " + email + " · password: " + tempPass + " (share this once; in a production build it would be emailed securely and hashed server-side, not stored in plain text — see B4).");
}
function filterPeople() {
  var q = document.getElementById("people-search").value.trim().toLowerCase();
  document.querySelectorAll("#a-people-body tr").forEach(function (tr) {
    tr.classList.toggle("hidden", q.length > 0 && tr.textContent.toLowerCase().indexOf(q) === -1);
  });
}
function assignModule() {
  var name = document.getElementById("assign-name").value;
  var mod = document.getElementById("assign-module").value;
  var person = STATE.people.filter(function (p) { return p.name === name; })[0];
  if (!person) { coming("Choose a worker to assign a module to."); return; }
  person.assigned = MODULES[mod].name;
  saveState(STATE);
  renderAdmin();
  coming(MODULES[mod].name + " assigned to " + name + ".");
}
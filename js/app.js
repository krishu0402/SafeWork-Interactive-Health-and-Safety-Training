
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
        {
          id: "cable",
          x: "10%",
          y: "76%",
          hazard: true,
          label: "Trailing cable across the walkway"
        },
        {
          id: "puddle",
          x: "55%",
          y: "82%",
          hazard: true,
          label: "Wet floor patch near the racking"
        },
        {
          id: "extinguisher",
          x: "88%",
          y: "40%",
          hazard: false,
          label: "Fire extinguisher — correctly mounted, not a hazard"
        }
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
        explain:
          "Assess the load first and use an appropriate lifting technique."
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
        explain:
          "Trip hazards should be reported and isolated, not stepped over or ignored."
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
        explain:
          "An unstable load should be reduced or moved with help, not rushed."
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
        explain:
          "Bending the knees and keeping the load close protects the spine."
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
        {
          id: "box-high",
          x: "62%",
          y: "22%",
          hazard: true,
          label: "Unsecured box on a high shelf, overhanging the aisle"
        },
        {
          id: "puddle2",
          x: "22%",
          y: "80%",
          hazard: true,
          label: "Spill in the forklift lane"
        },
        {
          id: "sign",
          x: "8%",
          y: "18%",
          hazard: false,
          label: "Warehouse safety signage — correctly displayed"
        }
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
        explain:
          "Report and isolate the hazard — don't attempt an unsafe fix yourself."
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
        explain:
          "A quick area check at shift start catches hazards before they cause harm."
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
        explain:
          "A friendly reminder first, with escalation if it continues, keeps everyone safe."
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
        explain:
          "Near-misses are reported so the underlying hazard gets fixed before it causes real harm."
      }
    ]
  },

  "ppe": {
    name: "Personal Protective Equipment",
    desc: "PPE selection, inspection and use",
    built: false
  },

  "fire-safety": {
    name: "Fire Safety",
    desc: "Emergency response and evacuation",
    built: false
  }
};

var MODULE_ORDER = [
  "manual-handling",
  "hazard-awareness",
  "ppe",
  "fire-safety"
];

/* ---------- Persistence ---------- */

function emptyProgress() {
  var progress = {};
  MODULE_ORDER.forEach(function (id) { progress[id] = { status: "not-started", score: null, completedAt: null }; });
  return progress;
}

function defaultState() {
  var progress = emptyProgress();

  return {
    worker: {
      name: "Alex Kumar",
      email: "alex.kumar@northgate-logistics.com",
      shift: "Inbound / receiving"
    },

    progress: progress,

    skill: {
      attempts: 0,
      best: 0,
      last: null
    },

    people: [
      {
        name: "Alex Kumar",
        email: "alex.kumar@northgate-logistics.com",
        role: "Worker",
        shift: "Inbound / receiving",
        progress: progress,
        assigned: "Manual Handling, Hazard Awareness",
        note: "Demo account — full progress tracked live",
        due: "—"
      },

      {
        name: "Sam Patel",
        email: "sam.patel@northgate-logistics.com",
        role: "Worker",
        shift: "Put-away / racking",
        progress: emptyProgress(),
        assigned: "Manual Handling",
        note: "Training due",
        due: "Overdue"
      },

      {
        name: "Riley Chen",
        email: "riley.chen@northgate-logistics.com",
        role: "Worker",
        shift: "Dispatch",
        progress: emptyProgress(),
        assigned: "Manual Handling",
        note: "Forklift complete",
        due: "—"
      },

      {
        name: "Jordan Lee",
        email: "jordan.lee@northgate-logistics.com",
        role: "Supervisor",
        assigned: "—",
        note: "Staff account",
        due: "—"
      }
    ]
  };
}

function loadState() {
  try {
    var raw = localStorage.getItem(DB_KEY);

    if (!raw) {
      var s = defaultState();
      saveState(s);
      return s;
    }

    var parsed = JSON.parse(raw);

    MODULE_ORDER.forEach(function (id) {
      if (!parsed.progress[id]) {
        parsed.progress[id] = {
          status: "not-started",
          score: null,
          completedAt: null
        };
      }
    });

    if (!parsed.skill) {
      parsed.skill = {
        attempts: 0,
        best: 0,
        last: null
      };
    }
    (parsed.people || []).forEach(function (person) {
      if (person.role === "Worker") {
        person.shift = person.shift || "Warehouse floor";
        person.progress = person.progress || emptyProgress();
        MODULE_ORDER.forEach(function (id) {
          person.progress[id] = person.progress[id] || { status: "not-started", score: null, completedAt: null };
        });
      }
    });
    return parsed;
  } catch (e) {
    var s2 = defaultState();
    saveState(s2);
    return s2;
  }
}

function saveState(s) {
  localStorage.setItem(DB_KEY, JSON.stringify(s));
}

var STATE = loadState();

var CURRENT_MODULE = null;
var FOUND = [];
var ANSWERS = [];
var QINDEX = 0;

/* ---------- Worker authentication ---------- */

function workerLogin() {
  var emailEl = document.getElementById("w-email");
  var passwordEl = document.getElementById("w-password");
  var email = emailEl.value.trim();
  var password = passwordEl ? passwordEl.value : "";
  var emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  var passwordOk = password.length >= 6;

  emailEl.classList.toggle("err", !emailOk);
  document.getElementById("w-email-err").textContent = emailOk ? "" : "Enter a valid work email address.";
  if (passwordEl) passwordEl.classList.toggle("err", !passwordOk);
  var passwordErr = document.getElementById("w-password-err");
  if (passwordErr) passwordErr.textContent = passwordOk ? "" : "Enter a password with at least 6 characters.";
  if (!emailOk || !passwordOk) return;

  var account = STATE.people.filter(function (p) {
    return p.role === "Worker" && p.email && p.email.toLowerCase() === email.toLowerCase();
  })[0];

  if (!account) {
    document.getElementById("w-email-err").textContent = "No worker account matches this email. Ask a supervisor to add the worker.";
    return;
  }

  STATE.worker = {
    name: account.name,
    email: account.email,
    shift: account.shift || "Warehouse floor"
  };
  STATE.currentWorkerEmail = account.email;
  STATE.progress = account.progress || emptyProgress();
  saveState(STATE);
  document.getElementById("login").classList.add("hidden");
  document.getElementById("app").classList.remove("hidden");
  page("dashboard");
}

function workerLogout() {
  document.getElementById("app").classList.add("hidden");
  document.getElementById("login").classList.remove("hidden");
}

/* ---------- Staff authentication ---------- */

var STAFF_ACCOUNTS = [
  {
    name: "Jordan Lee",
    email: "jordan.lee@northgate-logistics.com",
    role: "supervisor"
  },

  {
    name: "Morgan Smith",
    email: "morgan.smith@northgate-logistics.com",
    role: "admin"
  }
];

var STAFF_SESSION_ROLE = null;

function staffLogin() {
  var role = document.getElementById("role").value;
  var emailEl = document.getElementById("a-email");
  var passwordEl = document.getElementById("a-password");
  var email = emailEl.value.trim();
  var password = passwordEl ? passwordEl.value : "";
  var emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  var passwordOk = password.length >= 6;

  emailEl.classList.toggle("err", !emailOk);
  document.getElementById("a-email-err").textContent = emailOk ? "" : "Enter a valid work email address.";
  if (passwordEl) passwordEl.classList.toggle("err", !passwordOk);
  var passwordErr = document.getElementById("a-password-err");
  if (passwordErr) passwordErr.textContent = passwordOk ? "" : "Enter a password with at least 6 characters.";
  if (!emailOk || !passwordOk) return;

  var account = STAFF_ACCOUNTS.filter(function (item) {
    return item.role === role && item.email.toLowerCase() === email.toLowerCase();
  })[0];

  if (!account) {
    document.getElementById("a-email-err").textContent = "No staff account matches this email and role.";
    return;
  }

  STAFF_SESSION_ROLE = account.role;
  document.getElementById("login").classList.add("hidden");
  document.getElementById("app").classList.remove("hidden");
  document.getElementById("roleText").textContent = account.role === "admin" ? "Administrator" : "Supervisor";
  document.getElementById("staffName").textContent = account.name;

  var peopleButton = document.querySelector('[data-p="people"]');
  if (peopleButton) peopleButton.classList.toggle("hidden", account.role !== "supervisor");
  var contentButton = document.querySelector('[data-p="content"]');
  if (contentButton) contentButton.classList.toggle("hidden", account.role !== "admin");

  page("overview");
  renderAdmin();
}

function staffLogout() {
  document.getElementById("app").classList.add("hidden");
  document.getElementById("login").classList.remove("hidden");

  var role = document.getElementById("role");
  var email = document.getElementById("a-email");
  if (email) email.value = role && role.value === "admin" ? "morgan.smith@northgate-logistics.com" : "jordan.lee@northgate-logistics.com";

  document.getElementById("a-email").classList.remove("err");

  var emailErr = document.getElementById("a-email-err");

  if (emailErr) emailErr.textContent = "";
}

/* ---------- Navigation ---------- */

function page(id) {
  if (id === "people" && !isSupervisor()) { id = "overview"; }
  if (id === "content" && STAFF_SESSION_ROLE !== "admin") { id = "overview"; }
  document.querySelectorAll(".page").forEach(function (el) {
    el.classList.add("hidden");
  });

  var target = document.getElementById(id);

  if (target) {
    target.classList.remove("hidden");
  }

  document
    .querySelectorAll(".side button[data-p]")
    .forEach(function (btn) {
      btn.classList.toggle("active", btn.dataset.p === id);
    });

  if (id === "dashboard") renderDashboard();
  if (id === "training") renderTraining();
  if (id === "progress") renderProgress();
  if (id === "reminders") renderReminders();

  if (
    id === "overview" ||
    id === "people" ||
    id === "content"
  ) {
    renderAdmin();
  }
}

function coming(message) {
  var toast = document.getElementById("toast");

  if (!toast) return;

  toast.textContent = message;
  toast.classList.remove("hidden");

  clearTimeout(coming._t);

  coming._t = setTimeout(function () {
    toast.classList.add("hidden");
  }, 4200);
}

/* ---------- Dashboard ---------- */

function computeStats() {
  var ids = MODULE_ORDER;

  var built = ids.filter(function (i) {
    return MODULES[i].built;
  });

  var completed = built.filter(function (i) {
    return STATE.progress[i].status === "completed";
  });

  var scores = completed.map(function (i) {
    return STATE.progress[i].score;
  });

  var avg = scores.length
    ? Math.round(
        scores.reduce(function (a, b) {
          return a + b;
        }, 0) / scores.length
      )
    : 0;

  var overallPct = Math.round(
    (completed.length / ids.length) * 100
  );

  return {
    completed: completed.length,
    total: ids.length,
    avg: avg,
    overallPct: overallPct
  };
}

function renderDashboard() {
  var s = computeStats();

  var firstName = STATE.worker.name.split(" ")[0];

  var greet = document.getElementById("d-greet");

  if (greet) {
    greet.textContent = "Good morning, " + firstName;
  }

  var who = document.getElementById("whoHeader");

  if (who) {
    who.textContent =
      STATE.worker.name +
      " · " +
      (STATE.worker.shift || "Warehouse floor");
  }

  document.getElementById("d-overall").textContent =
    s.overallPct + "%";

  document.getElementById("d-modules").textContent =
    s.completed + " / " + s.total;

  document.getElementById("d-lastscore").textContent =
    s.avg ? s.avg + "%" : "—";

  document.getElementById("d-due").textContent =
    dueModules().length;

  var skillEl = document.getElementById("d-skill");

  if (skillEl) {
    skillEl.textContent = STATE.skill.attempts
      ? STATE.skill.best + "%"
      : "—";
  }

  var journey = document.getElementById("d-journey");

  if (journey) {
    journey.innerHTML = [
      "Sign in",
      "Explore hazards",
      "Complete quiz",
      "Review result"
    ]
      .map(function (step, i) {
        return (
          '<div class="journey-step ' +
          (i === 0 ? "active" : "") +
          '">' +
          "<span>" +
          (i + 1) +
          "</span><b>" +
          step +
          "</b></div>"
        );
      })
      .join("");
  }
}

function dueModules() {
  return MODULE_ORDER.filter(function (id) {
    return (
      MODULES[id].built &&
      STATE.progress[id].status !== "completed"
    );
  });
}

/* ---------- Training list ---------- */

function renderTraining() {
  var wrap = document.getElementById("training-list");

  if (!wrap) return;

  wrap.innerHTML = "";

  MODULE_ORDER.forEach(function (id) {
    var m = MODULES[id];
    var p = STATE.progress[id];

    var row = document.createElement("div");

    row.className = "module";

    var statusPill =
      p.status === "completed"
        ? '<span class="pill ok">Completed · ' +
          p.score +
          "%</span>"
        : m.built
        ? '<span class="pill warn">Ready</span>'
        : '<span class="pill lock">Coming soon</span>';

    row.innerHTML =
      "<div><h3>" +
      m.name +
      " " +
      statusPill +
      "</h3><p>" +
      m.desc +
      "</p></div>";

    var btn = document.createElement("button");

    if (m.built) {
      btn.className = "btn btn-primary";

      btn.textContent =
        p.status === "completed" ? "Review" : "Open";

      btn.onclick = function () {
        startModule(id);
      };
    } else {
      btn.className = "btn btn-secondary";
      btn.textContent = "Coming soon";

      btn.onclick = function () {
        coming(
          m.name +
            " is scheduled for a later release. Manual Handling and Hazard Awareness are available now."
        );
      };
    }

    row.appendChild(btn);
    wrap.appendChild(row);
  });
}

/* ---------- Module flow ---------- */

function startModule(id) {
  CURRENT_MODULE = id;
  FOUND = [];
  ANSWERS = [];
  QINDEX = 0;

  page("module");
  renderIntro();
}

function setStep(n) {
  ["s1", "s2", "s3", "s4"].forEach(function (sid, i) {
    var el = document.getElementById(sid);

    if (!el) return;

    el.classList.remove("on", "done");

    if (i + 1 < n) {
      el.classList.add("done");
    }

    if (i + 1 === n) {
      el.classList.add("on");
    }
  });
}

function renderIntro() {
  setStep(1);

  var m = MODULES[CURRENT_MODULE];

  document.getElementById("module-body").innerHTML =
    '<div class="card"><h1 class="title">' +
    m.name +
    '</h1><p class="sub">' +
    m.desc +
    "</p>" +
    "<p>You will spot the hazards in the scene, then answer " +
    m.questions.length +
    " scenario questions. A score of " +
    PASS_MARK +
    "%+ passes (provisional threshold, pending client confirmation).</p>" +
    '<button class="btn btn-primary" onclick="renderHotspot()">Start</button> ' +
    '<button class="btn btn-ghost" onclick="page(\'training\')">Back to training</button></div>';
}

function renderHotspot() {
  setStep(2);

  var m = MODULES[CURRENT_MODULE];

  var pins = m.scene.hotspots
    .map(function (h, i) {
      return (
        '<button class="hotspot" style="left:' +
        h.x +
        ";top:" +
        h.y +
        '" onclick="clickHotspot(' +
        i +
        ')" id="hs' +
        i +
        '">' +
        (i + 1) +
        "</button>"
      );
    })
    .join("");

  document.getElementById("module-body").innerHTML =
    '<div class="scenario"><div class="scene"><div class="scene-label">' +
    m.scene.label +
    "</div>" +
    m.scene.html +
    pins +
    '</div><div class="card">' +
    '<span class="pill">Find the hazards</span><h2>Click each numbered point in the scene</h2>' +
    '<p class="sub">Some points are hazards, some are safe items placed to test your judgement.</p>' +
    '<div id="hs-feedback"></div>' +
    '<button id="hs-continue" class="btn btn-primary hidden" style="margin-top:10px" onclick="renderQuiz()">Continue to assessment</button>' +
    "</div></div>";
}

function clickHotspot(i) {
  var m = MODULES[CURRENT_MODULE];
  var h = m.scene.hotspots[i];

  var btn = document.getElementById("hs" + i);

  if (FOUND.indexOf(i) === -1) {
    FOUND.push(i);
  }

  btn.classList.add("found");

  if (!h.hazard) {
    btn.classList.add("safe");
  }

  var fb = document.getElementById("hs-feedback");

  var row = document.createElement("div");

  row.className = "feedback " + (h.hazard ? "bad" : "good");

  row.innerHTML =
    "<b>" +
    (i + 1) +
    ". " +
    (h.hazard ? "Hazard identified" : "Not a hazard") +
    "</b><br>" +
    h.label;

  fb.appendChild(row);

  var hazardsTotal = m.scene.hotspots.filter(function (x) {
    return x.hazard;
  }).length;

  var hazardsFound = FOUND.filter(function (idx) {
    return m.scene.hotspots[idx].hazard;
  }).length;

  if (hazardsFound >= hazardsTotal) {
    document
      .getElementById("hs-continue")
      .classList.remove("hidden");
  }
}

function renderQuiz() {
  setStep(3);

  QINDEX = 0;
  ANSWERS = [];

  showQuestion();
}

function showQuestion() {
  var m = MODULES[CURRENT_MODULE];
  var q = m.questions[QINDEX];

  var opts = q.options
    .map(function (opt, i) {
      return (
        '<button class="choice" id="opt' +
        i +
        '" onclick="selectAnswer(' +
        i +
        ')">' +
        String.fromCharCode(65 + i) +
        ". " +
        opt +
        "</button>"
      );
    })
    .join("");

  document.getElementById("module-body").innerHTML =
    '<div class="card" style="max-width:640px;margin:0 auto"><span class="pill">Question ' +
    (QINDEX + 1) +
    " of " +
    m.questions.length +
    "</span>" +
    "<h2>" +
    q.q +
    "</h2>" +
    opts +
    '<div id="q-feedback"></div>' +
    '<button id="q-next" class="btn btn-primary hidden" style="margin-top:10px" onclick="nextQuestion()">' +
    (QINDEX + 1 < m.questions.length
      ? "Next question"
      : "See my result") +
    "</button></div>";
}

function selectAnswer(i) {
  var m = MODULES[CURRENT_MODULE];
  var q = m.questions[QINDEX];

  if (ANSWERS[QINDEX] !== undefined) return;

  ANSWERS[QINDEX] = i;

  document.querySelectorAll(".choice").forEach(function (b, idx) {
    b.setAttribute("disabled", "true");

    if (idx === q.correct) {
      b.classList.add("correct");
    }

    if (idx === i && i !== q.correct) {
      b.classList.add("wrong");
    }
  });

  var fb = document.getElementById("q-feedback");

  fb.className =
    "feedback " + (i === q.correct ? "good" : "bad");

  fb.innerHTML =
    "<b>" +
    (i === q.correct ? "✓ Correct" : "✕ Not quite") +
    "</b><br>" +
    q.explain;

  document.getElementById("q-next").classList.remove("hidden");
}

function nextQuestion() {
  var m = MODULES[CURRENT_MODULE];

  if (QINDEX + 1 < m.questions.length) {
    QINDEX++;
    showQuestion();
  } else {
    finishModule();
  }
}

function passedStatus(score) {
  return score >= PASS_MARK ? "completed" : "in-progress";
}

function finishModule() {
  var m = MODULES[CURRENT_MODULE];

  var correct = ANSWERS.filter(function (a, i) {
    return a === m.questions[i].correct;
  }).length;

  var score = Math.round(
    (correct / m.questions.length) * 100
  );

  STATE.progress[CURRENT_MODULE] = {
    status: passedStatus(score),
    score: score,
    completedAt:
      score >= PASS_MARK ? new Date().toISOString() : null
  };

  var currentAccount = STATE.people.filter(function (p) { return p.email === STATE.currentWorkerEmail; })[0];
  if (currentAccount) currentAccount.progress = STATE.progress;
  saveState(STATE);

  renderResult(score);
}

function renderResult(score) {
  setStep(4);

  var m = MODULES[CURRENT_MODULE];
  var passed = score >= PASS_MARK;

  document.getElementById("module-body").innerHTML =
    '<div class="card" style="max-width:560px;margin:0 auto;text-align:center">' +
    '<div class="result-badge ' +
    (passed ? "pass" : "fail") +
    '">' +
    score +
    "%</div>" +
    '<h1 class="title">' +
    (passed ? "Module passed" : "Not passed yet") +
    "</h1>" +
    '<p class="sub">' +
    m.name +
    " · " +
    PASS_MARK +
    "% pass mark (provisional)</p>" +
    (passed
      ? '<button class="btn btn-primary" onclick="showCertificate()">View / download certificate</button> '
      : '<button class="btn btn-primary" onclick="startModule(\'' +
        CURRENT_MODULE +
        "')\">Retry module</button> ") +
    '<button class="btn btn-ghost" onclick="page(\'training\')">Back to training</button>' +
    '<div id="cert-slot" style="margin-top:18px"></div></div>';
}

/* ---------- Staff workspace ---------- */
function isSupervisor() {
  return STAFF_SESSION_ROLE === "supervisor";
}

function escapeHtml(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function workerRecords() {
  return STATE.people.filter(function (p) { return p.role === "Worker"; });
}

function renderAdmin() {
  var workers = workerRecords();
  var completed = 0;
  var assignedRecords = workers.length * 2;
  workers.forEach(function (w) {
    var progress = w.progress || {};
    ["manual-handling", "hazard-awareness"].forEach(function (id) {
      if (progress[id] && progress[id].status === "completed") completed++;
    });
  });
  var completion = assignedRecords ? Math.round(completed / assignedRecords * 100) : 0;
  var outstanding = Math.max(0, assignedRecords - completed);
  var el = document.getElementById("a-completion");
  if (el) el.textContent = completion + "%";
  var count = document.getElementById("a-workers");
  if (count) count.textContent = workers.length;
  var completedEl = document.getElementById("a-completed");
  if (completedEl) completedEl.textContent = completed;
  var outstandingEl = document.getElementById("a-outstanding");
  if (outstandingEl) outstandingEl.textContent = outstanding;
  var body = document.getElementById("a-people-body");
  if (body) {
    var query = (document.getElementById("people-search") || {}).value || "";
    query = query.toLowerCase();
    body.innerHTML = workers.filter(function (w) {
      return (w.name + " " + w.email + " " + w.role + " " + (w.shift || "")).toLowerCase().indexOf(query) >= 0;
    }).map(function (w) {
      var progress = w.progress || {};
      var done = Object.keys(progress).filter(function (id) { return progress[id] && progress[id].status === "completed"; }).length;
      var status = done >= 2 ? "Completed" : done ? "In training" : "Not started";
      return '<tr><td><b>' + escapeHtml(w.name) + '</b><br><span class="note">' + escapeHtml(w.shift || "Warehouse floor") + '</span></td><td>Worker / Trainee</td><td>' + escapeHtml(w.email) + '</td><td><span class="pill ' + (done >= 2 ? 'ok' : done ? '': 'warn') + '">' + status + '</span></td><td>' + escapeHtml(w.due || '—') + '</td><td>' + (isSupervisor() ? '<button class="btn btn-ghost btn-sm" onclick="editWorker(\'' + encodeURIComponent(w.email) + '\')">✏️ Edit</button> <button class="btn btn-secondary btn-sm" onclick="deleteWorker(\'' + encodeURIComponent(w.email) + '\')">🗑️ Delete</button>' : '<span class="note">View only</span>') + '</td></tr>';
    }).join('') || '<tr><td colspan="6">No workers found.</td></tr>';
  }
  var assign = document.getElementById("assign-name");
  if (assign) assign.innerHTML = '<option value="">Select worker</option>' + workers.map(function (w) { return '<option value="' + escapeHtml(w.email) + '">' + escapeHtml(w.name) + '</option>'; }).join('');
  var summary = document.getElementById("a-overview-summary");
  if (summary) summary.innerHTML = '<div class="journey-step active"><span>' + workers.length + '</span><b>Registered workers</b></div><div class="journey-step"><span>' + completed + '</span><b>Completed records</b></div><div class="journey-step"><span>' + completion + '%</span><b>Calculated completion</b></div><div class="journey-step"><span>' + outstanding + '</span><b>Outstanding records</b></div>';
  var addCard = document.getElementById('supervisor-tools');
  if (addCard) addCard.classList.toggle('hidden', !isSupervisor());
}

function filterPeople() { renderAdmin(); }

function addWorker() {
  if (!isSupervisor()) return coming("Only a Supervisor can create worker accounts.");
  var name = document.getElementById("new-worker-name").value.trim();
  var email = document.getElementById("new-worker-email").value.trim().toLowerCase();
  var shift = document.getElementById("new-worker-shift").value;
  if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return coming("Enter a worker name and valid email.");
  if (STATE.people.some(function (p) { return p.email.toLowerCase() === email; })) return coming("A person with this email already exists.");
  var progress = {};
  MODULE_ORDER.forEach(function (id) { progress[id] = { status: "not-started", score: null, completedAt: null }; });
  STATE.people.push({ name: name, email: email, role: "Worker", shift: shift, assigned: "Manual Handling", due: "—", progress: progress });
  saveState(STATE);
  document.getElementById("new-worker-name").value = "";
  document.getElementById("new-worker-email").value = "";
  renderAdmin();
  coming("Worker added successfully.");
}

function editWorker(encodedEmail) {
  if (!isSupervisor()) return coming("Only a Supervisor can edit workers.");
  var email = decodeURIComponent(encodedEmail);
  var worker = STATE.people.filter(function (p) { return p.email === email; })[0];
  if (!worker) return;
  var name = prompt("Worker name:", worker.name);
  if (name === null) return;
  var shift = prompt("Shift / department:", worker.shift || "Warehouse floor");
  if (shift === null) return;
  worker.name = name.trim() || worker.name;
  worker.shift = shift.trim() || worker.shift;
  saveState(STATE); renderAdmin(); coming("Worker details updated.");
}

function deleteWorker(encodedEmail) {
  if (!isSupervisor()) return coming("Only a Supervisor can delete workers.");
  var email = decodeURIComponent(encodedEmail);
  var worker = STATE.people.filter(function (p) { return p.email === email; })[0];
  if (!worker) return;
  if (!confirm("Delete " + worker.name + "? This removes the local demo record.")) return;
  STATE.people = STATE.people.filter(function (p) { return p.email !== email; });
  saveState(STATE); renderAdmin(); coming("Worker deleted.");
}

function assignModule() {
  if (!isSupervisor()) return coming("Only a Supervisor can assign training.");
  var email = document.getElementById("assign-name").value;
  var moduleId = document.getElementById("assign-module").value;
  var worker = STATE.people.filter(function (p) { return p.email === email; })[0];
  if (!worker) return coming("Select a worker first.");
  worker.assigned = worker.assigned && worker.assigned !== "—" ? worker.assigned + ", " + MODULES[moduleId].name : MODULES[moduleId].name;
  if (!worker.progress) worker.progress = {};
  if (!worker.progress[moduleId]) worker.progress[moduleId] = { status: "not-started", score: null, completedAt: null };
  saveState(STATE); renderAdmin(); coming(MODULES[moduleId].name + " assigned to " + worker.name + ".");
}

function exportReport() {
  var rows = [['Name','Email','Shift','Assigned','Status']];
  workerRecords().forEach(function (w) { rows.push([w.name,w.email,w.shift || '',w.assigned || '', 'Demo record']); });
  var csv = rows.map(function (r) { return r.map(function (v) { return '"' + String(v).replace(/"/g,'""') + '"'; }).join(','); }).join('\n');
  var blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
  var url = URL.createObjectURL(blob); var a = document.createElement('a'); a.href=url; a.download='safework-worker-report.csv'; a.click(); URL.revokeObjectURL(url);
}

function showCertificate() {
  var slot = document.getElementById("cert-slot");
  if (!slot) return;
  slot.innerHTML = '<div class="card"><h3>Certificate preview</h3><p>This demo certificate confirms that ' + escapeHtml(STATE.worker.name) + ' completed ' + escapeHtml(MODULES[CURRENT_MODULE].name) + '.</p><button class="btn btn-secondary" onclick="window.print()">Print certificate</button></div>';
}



function renderProgress() {
  var s = computeStats();
  var completion = document.getElementById("p-completion");
  var avg = document.getElementById("p-avg");
  var completed = document.getElementById("p-completed");
  if (completion) completion.textContent = s.overallPct + "%";
  if (avg) avg.textContent = s.avg ? s.avg + "%" : "—";
  if (completed) completed.textContent = s.completed;
  var overdue = document.getElementById("p-overdue");
  if (overdue) overdue.textContent = dueModules().length;
  var body = document.getElementById("p-table-body");
  if (!body) return;
  body.innerHTML = MODULE_ORDER.map(function (id) {
    var p = STATE.progress[id];
    return '<tr><td>' + escapeHtml(MODULES[id].name) + '</td><td>' + escapeHtml(p.status) + '</td><td>' + (p.status === "completed" ? '100%' : p.status === "in-progress" ? '50%' : '0%') + '</td><td>' + (p.score == null ? '—' : p.score + '%') + '</td></tr>';
  }).join('');
}

function startSkillRefine() {
  page("skill");
  var body = document.getElementById("skill-body");
  if (!body) return;
  var questions = [
    {q:"What is the safest response to a spill in a forklift lane?", options:["Ignore it","Report and isolate it","Drive faster", "Cover it with a box"], correct:1, explain:"Report and isolate the spill so others are protected."},
    {q:"Before lifting a heavy or awkward item, you should…", options:["Assess the load and request help when needed","Twist while lifting","Lift quickly","Carry it above shoulder height"], correct:0, explain:"Assess the load and use assistance or equipment when required."}
  ];
  var index = 0, score = 0;
  function show() {
    var q = questions[index];
    body.innerHTML = '<div class="card"><span class="pill">Practice ' + (index+1) + ' of ' + questions.length + '</span><h2>' + q.q + '</h2>' + q.options.map(function(o,i){return '<button class="choice" data-i="'+i+'">'+String.fromCharCode(65+i)+'. '+o+'</button>';}).join('') + '<div id="skill-feedback"></div></div>';
    body.querySelectorAll('.choice').forEach(function(btn){btn.addEventListener('click',function(){var picked=Number(btn.dataset.i); body.querySelectorAll('.choice').forEach(function(b){b.disabled=true;}); if(picked===q.correct) score++; document.getElementById('skill-feedback').className='feedback '+(picked===q.correct?'good':'bad'); document.getElementById('skill-feedback').innerHTML=(picked===q.correct?'✓ Correct':'✕ Review')+'<br>'+q.explain; var next=document.createElement('button'); next.className='btn btn-primary'; next.textContent=index+1<questions.length?'Next':'Finish'; next.onclick=function(){index++; if(index<questions.length)show(); else {STATE.skill.attempts++; STATE.skill.last=Math.round(score/questions.length*100); STATE.skill.best=Math.max(STATE.skill.best,STATE.skill.last); saveState(STATE); body.innerHTML='<div class="card"><h2>Practice complete</h2><p>Your score: '+STATE.skill.last+'%</p><button class="btn btn-primary" onclick="page(\'dashboard\')">Back to dashboard</button></div>';}}; body.appendChild(next);});});
  }
  show();
}

function renderReminders() { coming("Reminder scheduling is represented as a future feature pending client confirmation of due dates and notification policy."); }

/* Login fields intentionally start empty. Users enter their own email and password. */

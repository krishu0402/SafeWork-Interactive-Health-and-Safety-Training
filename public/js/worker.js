// =====================================================================
// SafeWork – Worker Dashboard JavaScript (B6)
// =====================================================================

let allAssignments = [];
let currentModuleId = null;
let currentAssignmentId = null;
let currentModData = null;
let currentSlideIndex = 0;
let currentSlides = [];

// =====================================================================
// INIT
// =====================================================================
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const user = await API.request('/api/auth/me');
        if (user.role !== 'Worker') {
            window.location.href = '/login.html';
            return;
        }
        document.getElementById('welcome-message').innerText = `Welcome, ${user.first_name}`;
        document.getElementById('user-info').innerText = user.email;
        document.getElementById('sidebar-user-info').innerText = `${user.first_name} ${user.last_name}`;

        // Mobile sidebar toggle
        const sidebarOpen = document.getElementById('sidebar-open');
        const sidebarClose = document.getElementById('sidebar-close');
        const sidebar = document.getElementById('sidebar');
        if (sidebarOpen) sidebarOpen.addEventListener('click', () => sidebar.classList.add('open'));
        if (sidebarClose) sidebarClose.addEventListener('click', () => sidebar.classList.remove('open'));

        await loadDashboard();
    } catch (e) {
        console.error('Init error:', e);
        window.location.href = '/login.html';
    }
});

// =====================================================================
// HELPERS
// =====================================================================
function getStatusBadge(status) {
    const badges = {
        'Passed':     '<span class="badge badge-success">Passed</span>',
        'Completed':  '<span class="badge badge-success">Completed</span>',
        'Failed':     '<span class="badge badge-danger">Failed</span>',
        'Overdue':    '<span class="badge badge-danger">Overdue</span>',
        'In Progress':'<span class="badge badge-warning">In Progress</span>',
        'Not started':'<span class="badge badge-secondary">Not Started</span>'
    };
    return badges[status] || `<span class="badge badge-secondary">${status}</span>`;
}

function formatDate(dateStr) {
    if (!dateStr) return '–';
    return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function isPastDue(dueDate) {
    if (!dueDate) return false;
    const dateStr = String(dueDate).split('T')[0];
    const due = new Date(`${dateStr}T23:59:59`);
    return due < new Date();
}

function isOverdue(assignment) {
    return isPastDue(assignment.due_date)
        && assignment.status !== 'Passed'
        && assignment.status !== 'Completed';
}

function getEffectiveStatus(assignment) {
    if (isOverdue(assignment)) return 'Overdue';
    return assignment.status;
}

function hideAllViews() {
    document.querySelectorAll('.content-area > div').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('#main-nav a').forEach(a => a.classList.remove('active'));
}

function showView(viewId) {
    hideAllViews();
    if (viewId === 'module' || viewId === 'scenario') {
        const el = document.getElementById('view-scenario');
        if (el) el.classList.remove('hidden');
    } else {
        const el = document.getElementById('view-' + viewId);
        if (el) el.classList.remove('hidden');
    }
}

// =====================================================================
// NAVIGATION
// =====================================================================
function showDashboard(e) {
    if (e) e.preventDefault();
    hideAllViews();
    document.getElementById('view-dashboard').classList.remove('hidden');
    document.getElementById('nav-dashboard').classList.add('active');
    document.getElementById('sidebar').classList.remove('open');
    loadDashboard();
}

function showTraining(e) {
    if (e && e.preventDefault) e.preventDefault();
    hideAllViews();
    document.getElementById('view-training').classList.remove('hidden');
    document.getElementById('nav-training').classList.add('active');
    document.getElementById('sidebar').classList.remove('open');
    renderTrainingView('all');
}

async function showCertificates(e) {
    if (e && e.preventDefault) e.preventDefault();
    hideAllViews();
    document.getElementById('view-certificates').classList.remove('hidden');
    document.getElementById('nav-certificates').classList.add('active');
    document.getElementById('sidebar').classList.remove('open');
    renderCertificatesView();
}

async function showHistory(e) {
    if (e && e.preventDefault) e.preventDefault();
    hideAllViews();
    document.getElementById('view-history').classList.remove('hidden');
    document.getElementById('nav-history').classList.add('active');
    document.getElementById('sidebar').classList.remove('open');
    renderHistoryView();
}

async function showProfile(e) {
    if (e && e.preventDefault) e.preventDefault();
    hideAllViews();
    document.getElementById('view-profile').classList.remove('hidden');
    document.getElementById('nav-profile').classList.add('active');
    document.getElementById('sidebar').classList.remove('open');
    try {
        const user = await API.request('/api/auth/me');
        document.getElementById('profile-name').innerText = `${user.first_name} ${user.last_name}`;
        document.getElementById('profile-email').innerText = user.email;
        document.getElementById('profile-dept').innerText = user.department || '-';
        if (user.last_login) {
            document.getElementById('profile-login').innerText = new Date(user.last_login).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        } else {
            document.getElementById('profile-login').innerText = '-';
        }
    } catch (e) {
        console.error(e);
    }
}

// =====================================================================
// DASHBOARD
// =====================================================================
async function loadDashboard() {
    try {
        allAssignments = await API.request('/api/assignments/me');
        const stats = await API.request('/api/assignments/me/stats');

        // Update stat cards
        document.getElementById('stat-progress').innerText = `${stats.completion_pct}%`;
        document.getElementById('progress-bar-fill').style.width = `${stats.completion_pct}%`;
        document.getElementById('stat-completed').innerText = stats.completed;
        document.getElementById('stat-inprogress').innerText = stats.in_progress;
        document.getElementById('stat-overdue').innerText = stats.overdue;

        // Categorise assignments
        const upcoming = allAssignments.filter(a => {
            const eff = getEffectiveStatus(a);
            return eff !== 'Passed' && eff !== 'Completed' && eff !== 'Overdue';
        }).slice(0, 5);

        const overdue = allAssignments.filter(a => isOverdue(a));
        const recentActivity = [...allAssignments]
            .filter(a => a.status === 'Passed' || a.status === 'Failed' || a.status === 'In Progress')
            .sort((x, y) => new Date(y.completed_date || 0) - new Date(x.completed_date || 0))
            .slice(0, 5);

        // Render Upcoming
        const upcomingTbody = document.getElementById('upcoming-table-body');
        if (upcoming.length === 0) {
            upcomingTbody.innerHTML = '<tr><td colspan="4" class="empty-state">No upcoming training assigned.</td></tr>';
        } else {
            upcomingTbody.innerHTML = upcoming.map(a => {
                const eff = getEffectiveStatus(a);
                const btn = eff === 'Failed'
                    ? `<button class="btn btn-warning btn-sm" onclick="startModule(${a.module_id}, ${a.id})">Retake</button>`
                    : eff === 'In Progress'
                        ? `<button class="btn btn-primary btn-sm" onclick="startModule(${a.module_id}, ${a.id})">Continue</button>`
                        : `<button class="btn btn-primary btn-sm" onclick="startModule(${a.module_id}, ${a.id})">Start</button>`;
                return `<tr>
                    <td><strong>${a.title}</strong></td>
                    <td>${formatDate(a.due_date)}</td>
                    <td>${getStatusBadge(eff)}</td>
                    <td>${btn}</td>
                </tr>`;
            }).join('');
        }

        // Render Overdue
        const overdueTbody = document.getElementById('overdue-table-body');
        const overdueSection = document.getElementById('overdue-section');
        if (overdue.length > 0) {
            overdueSection.style.display = '';
            overdueTbody.innerHTML = overdue.map(a => `<tr>
                <td><strong>${a.title}</strong></td>
                <td style="color:#e74c3c;">${formatDate(a.due_date)}</td>
                <td>${getStatusBadge('Overdue')}</td>
                <td><button class="btn btn-danger btn-sm" onclick="startModule(${a.module_id}, ${a.id})">Start Now</button></td>
            </tr>`).join('');
        } else {
            overdueSection.style.display = 'none';
        }

        // Render Recent Activity
        const activityTbody = document.getElementById('recent-activity-body');
        if (recentActivity.length === 0) {
            activityTbody.innerHTML = '<tr><td colspan="4" class="empty-state">No activity yet. Start a training module to get going!</td></tr>';
        } else {
            activityTbody.innerHTML = recentActivity.map(a => `<tr>
                <td><strong>${a.title}</strong></td>
                <td>${getStatusBadge(getEffectiveStatus(a))}</td>
                <td>${a.score !== null ? a.score + '%' : '–'}</td>
                <td>${formatDate(a.completed_date)}</td>
            </tr>`).join('');
        }

    } catch (e) {
        console.error('Failed to load dashboard:', e);
    }
}

// =====================================================================
// MY TRAINING VIEW
// =====================================================================
function renderTrainingView(filter) {
    const grid = document.getElementById('course-grid-container');

    let filtered = allAssignments.length > 0 ? allAssignments : [];

    if (filtered.length === 0) {
        grid.innerHTML = '<p class="empty-state" style="padding:30px; text-align:center;">No training modules assigned yet. Contact your supervisor.</p>';
        return;
    }

    if (filter !== 'all') {
        filtered = filtered.filter(a => {
            const eff = getEffectiveStatus(a);
            if (filter === 'Overdue') return eff === 'Overdue';
            if (filter === 'Passed') return a.status === 'Passed' || a.status === 'Completed';
            return a.status === filter;
        });
    }

    if (filtered.length === 0) {
        grid.innerHTML = '<p class="empty-state" style="padding:30px; text-align:center;">No modules in this category.</p>';
        return;
    }

    grid.innerHTML = filtered.map(a => {
        const eff = getEffectiveStatus(a);
        const iconMap = {
            'Manual Handling': '📦',
            'Hazard Awareness': '⚠️',
            'PPE Awareness': '🦺',
            'Fire Safety': '🔥',
            'Moving Vehicles & Equipment': '🚜'
        };
        const icon = iconMap[a.title] || '📖';

        let actionBtn = '';
        if (eff === 'Passed' || eff === 'Completed') {
            actionBtn = `
                <div style="display:flex; gap:8px; width:100%;">
                    <button class="btn btn-success btn-sm" style="flex:1;" onclick="viewCertificate(${a.id})">Certificate 🎓</button>
                    <button class="btn btn-secondary btn-sm" style="flex:1;" title="Retest this module" onclick="retestTraining(${a.module_id}, ${a.id})">Retest 🔄</button>
                </div>
            `;
        } else if (eff === 'Failed') {
            actionBtn = `<button class="btn btn-warning btn-sm" style="width:100%;" onclick="startModule(${a.module_id}, ${a.id})">Retake Assessment 🔄</button>`;
        } else if (eff === 'In Progress') {
            actionBtn = `<button class="btn btn-primary btn-sm" style="width:100%;" onclick="startModule(${a.module_id}, ${a.id})">Continue Training →</button>`;
        } else if (eff === 'Overdue') {
            actionBtn = `<button class="btn btn-danger btn-sm" style="width:100%;" onclick="startModule(${a.module_id}, ${a.id})">Start Now (Overdue) ⚠️</button>`;
        } else {
            actionBtn = `<button class="btn btn-primary btn-sm" style="width:100%;" onclick="startModule(${a.module_id}, ${a.id})">Start Training →</button>`;
        }

        return `<div class="course-card">
            <div class="course-img" style="font-size:3rem; display:flex; align-items:center; justify-content:center;">
                ${icon}
                <span class="course-badge">${a.duration_minutes ? a.duration_minutes + ' min' : 'ONLINE'}</span>
            </div>
            <div class="course-info">
                <div class="course-title">${a.title}</div>
                <div class="course-desc">${a.description || ''}</div>
                <div style="display:flex; gap:8px; align-items:center; margin-bottom:8px; flex-wrap:wrap;">
                    ${getStatusBadge(eff)}
                    <span style="font-size:0.8rem; color:#a9bee3;">Due: ${formatDate(a.due_date)}</span>
                </div>
                <div style="font-size:0.8rem; color:#a9bee3;">Pass Mark: ${a.pass_mark}% ${a.score !== null ? '• Last score: ' + a.score + '%' : ''}</div>
                ${a.attempt_count > 0 ? `<div style="font-size:0.8rem; color:#a9bee3; margin-top:4px;">Attempts: ${a.attempt_count}</div>` : ''}
            </div>
            <div class="course-footer">${actionBtn}</div>
        </div>`;
    }).join('');
}

function filterTraining(filter, btn) {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderTrainingView(filter);
}

// =====================================================================
// TRAINING CONTENT SLIDES
// =====================================================================
const MODULE_CONTENT = {
    'Manual Handling': [
        {
            title: 'What is Manual Handling?',
            content: 'Manual handling is any activity that requires you to lift, lower, push, pull, carry, move, or support a load. It is one of the most common causes of workplace injury in the UK, particularly injuries to the back, neck, and shoulders.'
        },
        {
            title: 'Assessing a Load',
            content: '<strong>Before you lift anything, always assess:</strong><br><br>' +
                '• <strong>Weight</strong> – Can you lift this safely alone?<br>' +
                '• <strong>Size & shape</strong> – Can you grip it securely?<br>' +
                '• <strong>Route</strong> – Is the path clear? Any steps or obstacles?<br>' +
                '• <strong>Destination</strong> – Is there room to put it down safely?<br><br>' +
                'If in doubt, use a mechanical aid or ask for help.'
        },
        {
            title: 'The Safe Lifting Technique',
            content: '<strong>Follow these steps every time:</strong><br><br>' +
                '1. 🦶 Stand with feet shoulder-width apart, one foot slightly forward<br>' +
                '2. 🧎 Bend your knees — NOT your back<br>' +
                '3. 💪 Grip the load firmly with both hands<br>' +
                '4. 📦 Keep the load close to your body at waist height<br>' +
                '5. 🏋️ Lift smoothly using your legs<br>' +
                '6. 🚫 Do NOT twist your spine — move your feet to turn<br>' +
                '7. 📍 Lower the load by bending your knees, keeping your back straight'
        },
        {
            title: 'When to Ask for Help',
            content: '<strong>You must seek assistance or use mechanical aids when:</strong><br><br>' +
                '• The load is too heavy to lift comfortably<br>' +
                '• The load is large and obscures your view<br>' +
                '• You cannot get a secure grip<br>' +
                '• The route is uneven, narrow, or has stairs<br><br>' +
                '<strong>Equipment available:</strong> Trolleys, pallet trucks, hoists, and team lifts are all acceptable solutions. Never risk a back injury by struggling alone.'
        },
        {
            title: 'Key Points to Remember',
            content: '<strong>✅ Always:</strong><br>' +
                '• Plan the lift before you start<br>' +
                '• Keep your back straight and use your legs<br>' +
                '• Hold the load close to your body<br>' +
                '• Move your feet to turn, not your waist<br><br>' +
                '<strong>❌ Never:</strong><br>' +
                '• Bend from the waist to pick something up<br>' +
                '• Twist your back while carrying a load<br>' +
                '• Ignore pain or discomfort<br>' +
                '• Overestimate your capabilities'
        }
    ],
    'PPE Awareness': [
        {
            title: 'What is PPE?',
            content: 'Personal Protective Equipment (PPE) is any equipment worn to minimise exposure to hazards that can cause serious workplace injuries. PPE is your <strong>last line of defence</strong> after all other risk control measures have been put in place.'
        },
        {
            title: 'Your Required PPE',
            content: '<strong>In this warehouse, the following PPE is mandatory:</strong><br><br>' +
                '🦺 <strong>High-Visibility (Hi-Vis) Vest/Jacket</strong> — worn at all times on the floor<br>' +
                '👟 <strong>Steel-Toecap Safety Boots</strong> — protection against falling objects<br>' +
                '🧤 <strong>Gloves</strong> — when handling sharp, rough, or chemical materials<br>' +
                '👓 <strong>Eye Protection</strong> — when dust, chemicals, or flying debris present<br>' +
                '⛑ <strong>Hard Hat</strong> — in designated overhead hazard zones'
        },
        {
            title: 'Checking Your PPE',
            content: '<strong>Before using PPE, always inspect it:</strong><br><br>' +
                '• Check for cracks, tears, or missing parts<br>' +
                '• Ensure the size and fit are correct for you<br>' +
                '• Confirm it is the right PPE for the task<br>' +
                '• Check the expiry date where applicable (e.g. helmets)<br><br>' +
                '<strong>⚠ Damaged or ill-fitting PPE must be replaced immediately. Report it to your supervisor and do not use faulty equipment.</strong>'
        },
        {
            title: 'Wearing PPE Correctly',
            content: '<strong>PPE only works when worn correctly:</strong><br><br>' +
                '• Hi-vis must be fully visible — do not cover it with a regular jacket<br>' +
                '• Safety boots must be laced up properly and fastened<br>' +
                '• Gloves must be the right size — too loose can catch on equipment<br>' +
                '• Hard hats must sit level, not tilted back<br>' +
                '• Eye protection must form a seal around the eyes<br><br>' +
                'Incorrectly worn PPE provides little or no protection.'
        }
    ],
    'Fire Safety': [
        {
            title: 'Fire Hazards in the Workplace',
            content: '<strong>Common fire hazards in a warehouse include:</strong><br><br>' +
                '🔥 Cardboard, paper, and packaging materials near ignition sources<br>' +
                '⚡ Faulty or overloaded electrical equipment<br>' +
                '🚬 Smoking in unauthorised areas<br>' +
                '🧴 Flammable liquids stored incorrectly<br>' +
                '🚧 Obstructed ventilation near machinery<br><br>' +
                'Your responsibility: If you spot a fire hazard, report it immediately.'
        },
        {
            title: 'On Hearing the Fire Alarm',
            content: '<strong>When the alarm sounds, act immediately:</strong><br><br>' +
                '1. 🚪 Stop what you are doing<br>' +
                '2. 🏃 Leave the building via the NEAREST safe exit<br>' +
                '3. ❌ Do NOT use the lift<br>' +
                '4. ❌ Do NOT collect personal belongings<br>' +
                '5. 🚪 Close doors behind you as you leave<br>' +
                '6. 📍 Proceed directly to the fire assembly point<br><br>' +
                '<strong>Assume every alarm is real until told otherwise.</strong>'
        },
        {
            title: 'Emergency Exits & Assembly Points',
            content: '<strong>Know your exits:</strong><br><br>' +
                '• Emergency exits are marked with a green running figure sign<br>' +
                '• They must remain clear and unobstructed at ALL times<br>' +
                '• Fire assembly points are marked with a green square sign<br>' +
                '• Remain at the assembly point until the all-clear is given<br>' +
                '• A roll call will be taken — do not leave the assembly point<br><br>' +
                '<strong>Never re-enter the building until told it is safe by the fire warden.</strong>'
        },
        {
            title: 'Using Fire Equipment',
            content: '<strong>Fire extinguishers — only use if:</strong><br><br>' +
                '✅ The fire is small and contained<br>' +
                '✅ You have been trained to use the extinguisher<br>' +
                '✅ Your escape route is still clear<br>' +
                '✅ You are confident you can extinguish the fire<br><br>' +
                '<strong>If in doubt — GET OUT and call 999.</strong><br><br>' +
                '⚠ Different extinguishers are for different fires. <strong>NEVER use water on an electrical fire.</strong>'
        }
    ],
    'Hazard Awareness': [
        {
            title: 'Why Hazard Awareness Matters',
            content: 'A hazard is anything with the potential to cause harm. In a busy warehouse environment, hazards can appear quickly and change throughout the day. Recognising and reporting hazards promptly protects you and your colleagues.'
        },
        {
            title: 'Common Slip, Trip and Fall Hazards',
            content: '<strong>Watch out for:</strong><br><br>' +
                '💧 <strong>Liquid spills</strong> — report immediately and place a wet floor sign<br>' +
                '🔌 <strong>Loose cables</strong> — secure or report to prevent tripping<br>' +
                '📦 <strong>Goods left in walkways</strong> — always keep aisles clear<br>' +
                '🪜 <strong>Uneven flooring or broken pallets</strong> — report for repair<br>' +
                '🌧 <strong>Wet footprints near entrances</strong> — place matting or signs'
        },
        {
            title: 'Emergency Exit Hazards',
            content: '<strong>Fire exits must NEVER be:</strong><br><br>' +
                '• Blocked by goods, pallets, or equipment<br>' +
                '• Locked or obstructed in any way during working hours<br>' +
                '• Used as storage areas<br><br>' +
                '<strong>If you see a fire exit that is blocked, report it to your supervisor immediately.</strong> A blocked fire exit can prevent evacuation during a fire and is a serious legal violation.'
        },
        {
            title: 'Forklift and Vehicle Hazards',
            content: '<strong>Working near moving vehicles:</strong><br><br>' +
                '• Stay in marked pedestrian walkways at all times<br>' +
                '• Never walk in forklift operating zones unless authorised<br>' +
                '• Make eye contact with forklift operators before crossing<br>' +
                '• Be extra careful at blind corners and junctions<br>' +
                '• Do not wear headphones that block out vehicle noise<br><br>' +
                'Vehicle-pedestrian collisions are among the most serious warehouse accidents.'
        }
    ],
    'Moving Vehicles & Equipment': [
        {
            title: 'The Risk of Moving Vehicles',
            content: 'Collisions between moving vehicles and pedestrians are a leading cause of serious and fatal accidents in warehouses. Forklifts, pallet trucks, and other vehicles operate in the same space as workers — making awareness and caution essential at all times.'
        },
        {
            title: 'Pedestrian Rules',
            content: '<strong>As a pedestrian in a vehicle area:</strong><br><br>' +
                '• Always use designated pedestrian walkways<br>' +
                '• Never take shortcuts through vehicle zones<br>' +
                '• Look both ways before crossing any vehicle route<br>' +
                '• Slow down and look at blind corners using mirrors<br>' +
                '• Wear your hi-vis clothing so operators can see you<br>' +
                '• Never walk behind a reversing vehicle<br>' +
                '• Keep a safe distance of at least 3 metres from operating forklifts'
        },
        {
            title: 'Interacting with Forklift Operators',
            content: '<strong>When near a forklift:</strong><br><br>' +
                '1. 👀 Make eye contact with the operator<br>' +
                '2. ✋ Wait until they acknowledge you<br>' +
                '3. 👍 Only proceed when you are sure they have seen you<br><br>' +
                '<strong>Forklift operators have limited visibility:</strong><br>' +
                '• Their view is often blocked by the load they are carrying<br>' +
                '• There are large blind spots to the sides and rear<br>' +
                '• Never assume a forklift driver has seen you'
        },
        {
            title: 'Authorised Operators Only',
            content: '<strong>Forklift safety rules:</strong><br><br>' +
                '• Only trained and <strong>certified</strong> operators may drive a forklift<br>' +
                '• A car driving licence does NOT qualify someone to operate a forklift<br>' +
                '• Operators must complete a formal training course<br>' +
                '• Authorisation must be renewed regularly<br><br>' +
                '<strong>If you see someone operating a forklift without authorisation, report it immediately to your supervisor.</strong>'
        }
    ]
};

function getModuleContent(moduleTitle) {
    return MODULE_CONTENT[moduleTitle] || [
        {
            title: 'Training Module',
            content: 'Please complete this training module and proceed to the assessment.'
        }
    ];
}

// =====================================================================
// START MODULE (entry point from course cards / table)
// =====================================================================
async function startModule(moduleId, assignmentId) {
    currentModuleId = moduleId;
    currentAssignmentId = assignmentId;

    try {
        currentModData = await API.request(`/api/modules/${moduleId}`);

        // Mark as in progress
        await API.request(`/api/assignments/${assignmentId}/start`, { method: 'PUT' });

        // Refresh assignments list
        allAssignments = await API.request('/api/assignments/me');

        // Show content slides
        showContentView();
    } catch (e) {
        console.error('Error starting module:', e);
        alert('Error loading training module: ' + e.message);
    }
}

async function retestTraining(moduleId, assignmentId) {
    try {
        await API.request(`/api/assignments/${assignmentId}/reset`, { method: 'PUT' });
    } catch (err) {
        console.warn('Reset request note:', err.message);
    }
    await startModule(moduleId, assignmentId);
}

function restartScenario() {
    if (currentModData && currentModData.title) {
        const btnProceed = document.getElementById('btn-proceed-quiz');
        if (btnProceed) btnProceed.style.display = 'none';
        const feedback = document.getElementById('scenario-feedback');
        if (feedback) feedback.classList.add('hidden');
        renderScenarioForModule(currentModData.title);
    }
}

// =====================================================================
// CONTENT SLIDES
// =====================================================================
function showContentView() {
    hideAllViews();
    document.getElementById('view-content').classList.remove('hidden');
    document.getElementById('nav-training').classList.add('active');

    const modTitle = currentModData.title;
    document.getElementById('content-module-title').innerText = modTitle;

    currentSlides = getModuleContent(modTitle);
    currentSlideIndex = 0;
    renderSlide();
}

function renderSlide() {
    const slide = currentSlides[currentSlideIndex];
    const total = currentSlides.length;

    document.getElementById('slide-counter').innerText = `Slide ${currentSlideIndex + 1} of ${total}`;
    document.getElementById('btn-prev-slide').style.display = currentSlideIndex > 0 ? '' : 'none';
    document.getElementById('btn-next-slide').style.display = currentSlideIndex < total - 1 ? '' : 'none';
    document.getElementById('btn-start-scenario').style.display = currentSlideIndex === total - 1 ? '' : 'none';

    document.getElementById('content-slides-container').innerHTML = `
        <div class="content-slide">
            <h3 style="margin-bottom:20px; color:#18b8ff;">${slide.title}</h3>
            <div class="slide-body" style="font-size:1.05rem; line-height:1.8;">${slide.content}</div>
        </div>
    `;
}

function changeSlide(direction) {
    currentSlideIndex += direction;
    if (currentSlideIndex < 0) currentSlideIndex = 0;
    if (currentSlideIndex >= currentSlides.length) currentSlideIndex = currentSlides.length - 1;
    renderSlide();
}

// =====================================================================
// SCENARIOS (module-specific)
// =====================================================================
function startScenario() {
    hideAllViews();
    document.getElementById('view-scenario').classList.remove('hidden');
    document.getElementById('nav-training').classList.add('active');

    const modTitle = currentModData.title;
    document.getElementById('scenario-module-label').innerText = modTitle;
    document.getElementById('scenario-feedback').classList.add('hidden');
    document.getElementById('btn-proceed-quiz').style.display = 'none';

    renderScenarioForModule(modTitle);
}

function renderScenarioForModule(title) {
    const scenarioEl = document.getElementById('scenario-content');

    // Callback when all interactive hotspots are completed
    const onInteractiveComplete = () => {
        document.getElementById('btn-proceed-quiz').style.display = '';
        const feedback = document.getElementById('scenario-feedback');
        feedback.className = 'alert alert-success';
        feedback.classList.remove('hidden');
        feedback.innerHTML = '<strong>✅ All elements identified!</strong> Well done. You are ready to take the assessment.';
    };

    if (title === 'Hazard Awareness') {
        document.getElementById('scenario-title').innerText = 'Hazard Identification Scenario';
        document.getElementById('scenario-desc').innerText = 'Hover over the workplace scene to discover potential hazards. Click each hazard to investigate and choose the correct action.';
        InteractiveEngine.buildHazardAwarenessScene(scenarioEl, onInteractiveComplete);

    } else if (title === 'Manual Handling') {
        document.getElementById('scenario-title').innerText = 'Manual Handling – Interactive Learning';
        document.getElementById('scenario-desc').innerText = 'Hover over each body zone of the worker to learn the correct lifting technique. Click to investigate each area.';
        InteractiveEngine.buildManualHandlingScene(scenarioEl, onInteractiveComplete);

    } else if (title === 'PPE Awareness') {
        document.getElementById('scenario-title').innerText = 'PPE Awareness – Interactive Equipment Check';
        document.getElementById('scenario-desc').innerText = 'Hover over each PPE item to learn its purpose. Click to investigate and answer the safety question.';
        InteractiveEngine.buildPPEScene(scenarioEl, onInteractiveComplete);

    } else if (title === 'Fire Safety') {
        document.getElementById('scenario-title').innerText = 'Fire Safety – Emergency Response';
        document.getElementById('scenario-desc').innerText = 'Identify the emergency response elements in this fire scenario. Hover to discover, click to investigate.';
        InteractiveEngine.buildFireSafetyScene(scenarioEl, onInteractiveComplete);

    } else if (title === 'Moving Vehicles & Equipment') {
        document.getElementById('scenario-title').innerText = 'Moving Vehicles & Equipment – Safety Awareness';
        document.getElementById('scenario-desc').innerText = 'Identify the safety elements when working near moving vehicles. Hover to discover, click to investigate.';
        InteractiveEngine.buildVehicleScene(scenarioEl, onInteractiveComplete);

    } else {
        // Generic fallback (preserves existing behavior)
        document.getElementById('scenario-title').innerText = 'Training Scenario';
        document.getElementById('scenario-desc').innerText = 'Complete this scenario to proceed to the assessment.';
        scenarioEl.innerHTML = `
            <div style="text-align:center; padding:30px;">
                <p style="margin-bottom:20px;">You have reviewed the training content for this module.</p>
                <button class="btn btn-success" onclick="document.getElementById('btn-proceed-quiz').style.display=''; document.getElementById('scenario-feedback').classList.add('hidden')">Ready for Assessment</button>
            </div>
        `;
        document.getElementById('btn-proceed-quiz').style.display = '';
    }
}

let hazardsFound = new Set();
function identifyHazard(id, description, countEl) {
    if (hazardsFound.has(id)) return;
    hazardsFound.add(id);

    const el = document.getElementById(id);
    if (el) {
        el.style.background = 'rgba(46,213,115,0.4)';
        el.style.borderColor = '#2ed573';
        el.style.pointerEvents = 'none';
    }

    const feedback = document.getElementById('scenario-feedback');
    feedback.className = 'alert alert-success';
    feedback.classList.remove('hidden');
    feedback.innerHTML = `<strong>✅ Hazard identified!</strong> ${description}`;

    if (countEl) countEl.innerText = hazardsFound.size;

    if (hazardsFound.size >= 3) {
        document.getElementById('btn-proceed-quiz').style.display = '';
        feedback.innerHTML = `<strong>✅ All 3 hazards identified!</strong> Well done. You are ready to take the assessment.`;
    }
}

function answerScenario(btn, isCorrect, explanation) {
    // Disable all option buttons
    document.querySelectorAll('.scenario-option').forEach(b => {
        b.disabled = true;
        b.style.opacity = '0.6';
    });
    btn.style.opacity = '1';

    const feedback = document.getElementById('scenario-feedback');
    feedback.classList.remove('hidden');

    if (isCorrect) {
        btn.classList.add('option-correct');
        feedback.className = 'alert alert-success';
        feedback.innerHTML = `<strong>✅ Correct!</strong> ${explanation}`;
        document.getElementById('btn-proceed-quiz').style.display = '';
    } else {
        btn.classList.add('option-incorrect');
        // Highlight the correct button
        document.querySelectorAll('.correct-option').forEach(b => b.classList.add('option-correct'));
        feedback.className = 'alert alert-error';
        feedback.innerHTML = `<strong>❌ Incorrect.</strong> ${explanation}<br><br><em>Review the correct answer above, then proceed to the assessment.</em>`;
        document.getElementById('btn-proceed-quiz').style.display = '';
    }
}

// =====================================================================
// QUIZ
// =====================================================================
let quizAnswers = {};
let currentQuestionIndex = 0;

function showQuizView() {
    hideAllViews();
    document.getElementById('view-quiz').classList.remove('hidden');
    document.getElementById('nav-training').classList.add('active');

    hazardsFound = new Set(); // reset for next time

    const mod = currentModData;
    quizAnswers = {};
    currentQuestionIndex = 0;

    renderQuizQuestion();
}

function renderQuizQuestion() {
    const mod = currentModData;
    const q = mod.questions[currentQuestionIndex];
    const total = mod.questions.length;
    const pct = Math.round(((currentQuestionIndex) / total) * 100);
    const container = document.getElementById('quiz-container');

    container.innerHTML = `
        <div style="margin-bottom:20px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                <h3 style="margin:0;">${mod.title} — Assessment</h3>
                <span style="font-size:0.9rem; color:#a9bee3;">Question ${currentQuestionIndex + 1} of ${total}</span>
            </div>
            <div class="progress-bar">
                <div class="progress-fill" style="width:${pct}%; transition:width 0.3s;"></div>
            </div>
        </div>

        <div class="quiz-question">
            <p style="font-size:1.15rem; font-weight:600; margin-bottom:20px; line-height:1.5;">
                ${currentQuestionIndex + 1}. ${q.question_text}
            </p>
            <div class="quiz-options" id="quiz-options">
                ${q.options.map(opt => `
                    <label class="quiz-option-label" id="label-${opt.id}">
                        <input type="radio" name="quiz_answer" value="${opt.id}"
                               onchange="selectAnswer(${q.id}, ${opt.id}, ${opt.id})">
                        <span>${opt.option_text}</span>
                    </label>
                `).join('')}
            </div>
        </div>

        <div id="quiz-error" class="alert alert-error hidden" style="margin-top:15px;">Please select an answer before continuing.</div>

        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:25px; flex-wrap:wrap; gap:10px;">
            ${currentQuestionIndex > 0
                ? `<button class="btn btn-secondary" onclick="quizNav(-1)">← Previous</button>`
                : `<span></span>`
            }
            ${currentQuestionIndex < total - 1
                ? `<button class="btn btn-primary" onclick="quizNav(1)">Next Question →</button>`
                : `<button class="btn btn-success" onclick="submitQuiz()">Submit Assessment</button>`
            }
        </div>
    `;
}

function selectAnswer(questionId, optionId) {
    quizAnswers[questionId] = optionId;
    document.getElementById('quiz-error').classList.add('hidden');
    // Visual feedback — highlight selected
    document.querySelectorAll('.quiz-option-label').forEach(l => l.classList.remove('selected'));
    const radio = document.querySelector(`input[value="${optionId}"]`);
    if (radio && radio.parentElement) radio.parentElement.classList.add('selected');
}

function quizNav(direction) {
    const mod = currentModData;
    const q = mod.questions[currentQuestionIndex];
    if (direction > 0 && !quizAnswers[q.id]) {
        document.getElementById('quiz-error').classList.remove('hidden');
        return;
    }
    currentQuestionIndex += direction;
    if (currentQuestionIndex < 0) currentQuestionIndex = 0;
    if (currentQuestionIndex >= mod.questions.length) currentQuestionIndex = mod.questions.length - 1;
    renderQuizQuestion();
    // Restore previously selected answer
    const prevAnswer = quizAnswers[mod.questions[currentQuestionIndex].id];
    if (prevAnswer) {
        const radio = document.querySelector(`input[value="${prevAnswer}"]`);
        if (radio) {
            radio.checked = true;
            if (radio.parentElement) radio.parentElement.classList.add('selected');
        }
    }
}

async function submitQuiz() {
    const mod = currentModData;
    const lastQ = mod.questions[currentQuestionIndex];
    if (!quizAnswers[lastQ.id]) {
        document.getElementById('quiz-error').classList.remove('hidden');
        return;
    }

    const container = document.getElementById('quiz-container');
    container.innerHTML = '<p style="text-align:center; padding:30px;">Submitting your answers...</p>';

    try {
        const result = await API.request(`/api/assignments/${currentAssignmentId}/submit`, {
            method: 'POST',
            body: { answers: quizAnswers }
        });

        await loadDashboard(); // refresh assignments
        allAssignments = await API.request('/api/assignments/me');

        showQuizResult(result);
    } catch (err) {
        container.innerHTML = `<div class="alert alert-error">Error submitting quiz: ${err.message}</div>
            <button class="btn btn-secondary" onclick="showTraining(null)" style="margin-top:15px;">Back to Training</button>`;
    }
}

// =====================================================================
// QUIZ RESULT
// =====================================================================
function showQuizResult(res) {
    hideAllViews();
    document.getElementById('view-result').classList.remove('hidden');
    document.getElementById('nav-training').classList.add('active');

    const resultContainer = document.getElementById('result-container');
    const passed = res.passed;
    const pct = Math.round((res.correct_answers / res.total_questions) * 100);

    let questionFeedbackHtml = '';
    if (res.question_results && res.question_results.length > 0) {
        questionFeedbackHtml = `
            <div style="margin-top:25px; text-align:left;">
                <h4 style="margin-bottom:15px;">${passed ? 'Question Review:' : 'Correct Answers:'}</h4>
                ${res.question_results.map((qr, i) => `
                    <div class="feedback-item ${qr.is_correct ? 'feedback-correct' : 'feedback-incorrect'}">
                        <div style="font-weight:600; margin-bottom:6px;">${i + 1}. ${qr.question_text}</div>
                        <div style="font-size:0.9rem;">
                            <span style="color:${qr.is_correct ? '#2ed573' : '#e74c3c'};">
                                Your answer: ${qr.submitted_answer || 'Not answered'}
                            </span>
                        </div>
                        ${!qr.is_correct ? `<div style="font-size:0.9rem; color:#2ed573; margin-top:4px;">Correct answer: ${qr.correct_answer}</div>` : ''}
                        ${qr.explanation ? `<div style="font-size:0.85rem; color:#a9bee3; margin-top:6px; font-style:italic;">${qr.explanation}</div>` : ''}
                    </div>
                `).join('')}
            </div>
        `;
    }

    resultContainer.innerHTML = `
        <div style="text-align:center; padding:20px 0;">
            <div style="font-size:3.5rem; margin-bottom:10px;">${passed ? '🎉' : '📋'}</div>
            <h2 class="${passed ? 'text-success' : 'text-error'}" style="font-size:1.8rem; margin-bottom:15px;">
                ${passed ? 'Assessment Passed!' : 'Assessment Not Passed'}
            </h2>

            <div style="display:flex; gap:20px; justify-content:center; flex-wrap:wrap; margin:20px 0;">
                <div class="result-stat">
                    <div class="result-stat-label">Your Score</div>
                    <div class="result-stat-value ${passed ? 'text-success' : 'text-error'}">${res.score}%</div>
                </div>
                <div class="result-stat">
                    <div class="result-stat-label">Pass Mark</div>
                    <div class="result-stat-value">${res.pass_mark}%</div>
                </div>
                <div class="result-stat">
                    <div class="result-stat-label">Correct</div>
                    <div class="result-stat-value">${res.correct_answers} / ${res.total_questions}</div>
                </div>
            </div>

            ${passed
                ? `<div class="alert alert-success" style="margin:15px 0;">
                    ✅ Congratulations! Your certificate has been issued. You can view and print it from the Certificates section.
                   </div>`
                : `<div class="alert alert-error" style="margin:15px 0;">
                    ❌ You did not reach the required pass mark of ${res.pass_mark}%. Review the correct answers below, then retake the assessment.
                   </div>`
            }

            <div style="display:flex; gap:10px; justify-content:center; flex-wrap:wrap; margin-top:20px;">
                <button class="btn btn-secondary" onclick="showDashboard(null)">Back to Dashboard</button>
                ${passed
                    ? `<button class="btn btn-success" onclick="viewCertificate(${currentAssignmentId})">View Certificate 🎓</button>
                       <button class="btn btn-warning" onclick="retestTraining(${currentModuleId}, ${currentAssignmentId})">Retest Training 🔄</button>`
                    : `<button class="btn btn-secondary" onclick="startModule(${currentModuleId}, ${currentAssignmentId})">Review Training</button>
                       <button class="btn btn-warning" onclick="showQuizView()">Retake Assessment</button>`
                }
            </div>
        </div>
        ${questionFeedbackHtml}
    `;
}

// =====================================================================
// CERTIFICATES VIEW
// =====================================================================
function renderCertificatesView() {
    const tbody = document.getElementById('certificates-table-body');
    tbody.innerHTML = '';

    let passed = 0, failed = 0;
    let bestModule = { score: -1, title: '–' };
    let worstModule = { score: 101, title: '–' };

    allAssignments.forEach(a => {
        const eff = getEffectiveStatus(a);
        if (eff === 'Passed' || eff === 'Completed') {
            passed++;
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${a.title}</strong></td>
                <td>${a.score !== null ? a.score + '%' : '–'}</td>
                <td>${formatDate(a.completed_date)}</td>
                <td>${a.attempt_count || '–'}</td>
                <td><button class="btn btn-success btn-sm" onclick="viewCertificate(${a.id})">View Certificate</button></td>
            `;
            tbody.appendChild(tr);
        } else if (a.status === 'Failed') {
            failed++;
        }
        if (a.score !== null) {
            if (a.score > bestModule.score) bestModule = { score: a.score, title: a.title };
            if (a.score < worstModule.score && a.score >= 0) worstModule = { score: a.score, title: a.title };
        }
    });

    if (passed === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="empty-state">No certificates earned yet. Complete a training module to earn your first certificate.</td></tr>';
    }

    document.getElementById('perf-passed').innerText = passed;
    document.getElementById('perf-failed').innerText = failed;
    document.getElementById('perf-best').innerText = bestModule.score >= 0 ? `${bestModule.title} (${bestModule.score}%)` : '–';
    document.getElementById('perf-worst').innerText = worstModule.score <= 100 && failed > 0 ? `${worstModule.title} (${worstModule.score}%)` : '–';
}

// =====================================================================
// HISTORY VIEW
// =====================================================================
function renderHistoryView() {
    const tbody = document.getElementById('history-table-body');
    tbody.innerHTML = '';

    if (allAssignments.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No training history yet.</td></tr>';
        return;
    }

    allAssignments.forEach(a => {
        const eff = getEffectiveStatus(a);
        const certBtn = (eff === 'Passed' || eff === 'Completed')
            ? `<button class="btn btn-success btn-sm" onclick="viewCertificate(${a.id})">View</button>`
            : '–';
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${a.title}</strong></td>
            <td>${getStatusBadge(eff)}</td>
            <td>${a.score !== null ? a.score + '%' : '–'}</td>
            <td>${a.attempt_count || 0}</td>
            <td>${formatDate(a.completed_date)}</td>
            <td>${formatDate(a.due_date)}</td>
            <td>${certBtn}</td>
        `;
        tbody.appendChild(tr);
    });
}

// =====================================================================
// CERTIFICATE
// =====================================================================
function viewCertificate(assignmentId) {
    window.open(`/api/assignments/${assignmentId}/certificate`, '_blank');
}

function csvValue(value) {
    let text = String(value ?? '');
    if (/^[=+\-@]/.test(text)) {
        text = "'" + text;
    }
    return `"${text.replace(/"/g, '""')}"`;
}

// =====================================================================
// CSV DOWNLOAD
// =====================================================================
async function downloadMarksCSV() {
    try {
        const assignments = await API.request('/api/assignments/me');
        let csv = 'Module,Status,Score,Pass Mark,Due Date,Completed Date,Attempts\n';
        assignments.forEach(a => {
            const eff = getEffectiveStatus(a);
            csv += `${csvValue(a.title)},${csvValue(eff)},${csvValue(a.score !== null ? a.score + '%' : '-')},${csvValue(a.pass_mark + '%')},${csvValue(formatDate(a.due_date))},${csvValue(formatDate(a.completed_date))},${csvValue(a.attempt_count || 0)}\n`;
        });
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'My_Training_Record.csv';
        link.click();
        window.URL.revokeObjectURL(url);
    } catch (e) {
        alert('Failed to download training record.');
    }
}

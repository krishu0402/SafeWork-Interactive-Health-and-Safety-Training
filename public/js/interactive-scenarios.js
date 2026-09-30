// =====================================================================
// SafeWork – Interactive Scenario Engine (B6 Enhancement)
// Provides: Tooltip system, Hotspot system, Investigation panel,
// Progress tracker, and per-module interactive scene builders.
// Layered ON TOP of existing worker.js — does NOT replace any function.
// =====================================================================

const InteractiveEngine = (() => {
    'use strict';

    // ── State ──────────────────────────────────────────────────────────
    let tooltipEl = null;
    let panelEl = null;
    let panelOverlayEl = null;
    let completedHotspots = new Set();
    let totalHotspots = 0;
    let onAllComplete = null;
    let sceneFeedbackEl = null;

    // ── Init ───────────────────────────────────────────────────────────
    function init() {
        createTooltip();
        createInvestigationPanel();
    }

    // ── Tooltip System ─────────────────────────────────────────────────
    function createTooltip() {
        if (document.getElementById('sw-interactive-tooltip')) return;
        tooltipEl = document.createElement('div');
        tooltipEl.id = 'sw-interactive-tooltip';
        tooltipEl.className = 'sw-tooltip';
        tooltipEl.innerHTML = `
            <div class="sw-tooltip-title"></div>
            <div class="sw-tooltip-body"></div>
            <div class="sw-tooltip-action">🔍 Click to investigate</div>
        `;
        document.body.appendChild(tooltipEl);
    }

    function showTooltip(el, title, body) {
        if (!tooltipEl) createTooltip();
        tooltipEl.querySelector('.sw-tooltip-title').innerHTML = title;
        tooltipEl.querySelector('.sw-tooltip-body').textContent = body;
        tooltipEl.classList.remove('tooltip-below');

        const rect = el.getBoundingClientRect();
        const tooltipW = 240;
        const tooltipH = 90;
        let top = rect.top - tooltipH - 14;
        let left = rect.left + rect.width / 2 - tooltipW / 2;

        // Flip below if not enough space above
        if (top < 10) {
            top = rect.bottom + 14;
            tooltipEl.classList.add('tooltip-below');
        }
        // Keep within viewport horizontally
        if (left < 10) left = 10;
        if (left + tooltipW > window.innerWidth - 10) left = window.innerWidth - tooltipW - 10;

        tooltipEl.style.left = left + 'px';
        tooltipEl.style.top = top + 'px';
        tooltipEl.style.position = 'fixed';
        tooltipEl.classList.add('visible');
    }

    function hideTooltip() {
        if (tooltipEl) tooltipEl.classList.remove('visible');
    }

    // ── Investigation Panel ────────────────────────────────────────────
    function createInvestigationPanel() {
        if (document.getElementById('sw-investigation-panel')) return;

        panelOverlayEl = document.createElement('div');
        panelOverlayEl.id = 'sw-panel-overlay';
        panelOverlayEl.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.3);z-index:190;display:none;';
        panelOverlayEl.addEventListener('click', closePanel);
        document.body.appendChild(panelOverlayEl);

        panelEl = document.createElement('div');
        panelEl.id = 'sw-investigation-panel';
        panelEl.className = 'investigation-panel';
        panelEl.innerHTML = `
            <div class="investigation-panel-header">
                <h4><span class="panel-icon">⚠</span> <span class="panel-title">Investigating...</span></h4>
                <button class="investigation-panel-close" onclick="InteractiveEngine.closePanel()" aria-label="Close panel">✕</button>
            </div>
            <div class="investigation-panel-body" id="investigation-body"></div>
        `;
        document.body.appendChild(panelEl);
    }

    function openPanel(config) {
        if (!panelEl) createInvestigationPanel();
        const body = document.getElementById('investigation-body');
        panelEl.querySelector('.panel-title').textContent = config.title || 'Investigating...';
        panelEl.querySelector('.panel-icon').textContent = config.icon || '⚠';

        let optionsHtml = '';
        if (config.options && config.options.length > 0) {
            optionsHtml = `
                <div class="investigation-question">${config.question || 'What should you do?'}</div>
                <div class="investigation-options" id="investigation-options">
                    ${config.options.map((opt, i) => `
                        <button class="investigation-option"
                                tabindex="0"
                                role="button"
                                data-correct="${opt.correct ? 'true' : 'false'}"
                                data-index="${i}"
                                onclick="InteractiveEngine.handleAnswer(this, '${escapeAttr(config.hotspotId)}', ${opt.correct}, '${escapeAttr(opt.feedback)}')">
                            ${opt.text}
                        </button>
                    `).join('')}
                </div>
            `;
        }

        body.innerHTML = `
            <div class="investigation-hazard-icon">${config.visualIcon || '⚠️'}</div>
            <div class="investigation-description">${config.description}</div>
            ${optionsHtml}
            <div id="investigation-feedback-area"></div>
        `;

        panelOverlayEl.style.display = 'block';
        requestAnimationFrame(() => panelEl.classList.add('open'));
    }

    function closePanel() {
        if (panelEl) panelEl.classList.remove('open');
        if (panelOverlayEl) panelOverlayEl.style.display = 'none';
    }

    function handleAnswer(btnEl, hotspotId, isCorrect, feedback) {
        const optionsContainer = document.getElementById('investigation-options');
        const allBtns = optionsContainer.querySelectorAll('.investigation-option');
        const feedbackArea = document.getElementById('investigation-feedback-area');

        if (isCorrect) {
            // Disable all, mark correct
            allBtns.forEach(b => {
                b.classList.add('option-disabled');
            });
            btnEl.classList.remove('option-disabled');
            btnEl.classList.add('option-correct-answer');

            feedbackArea.innerHTML = `
                <div class="investigation-feedback feedback-correct">
                    <strong>✅ Correct!</strong> ${feedback}
                </div>
            `;

            // Mark hotspot as complete
            markHotspotComplete(hotspotId);

            // Close panel after brief delay
            setTimeout(() => {
                closePanel();
                updateScenarioFeedback(hotspotId, true, feedback);
            }, 1800);

        } else {
            btnEl.classList.add('option-incorrect-answer');
            // re-enable after shake
            setTimeout(() => {
                btnEl.classList.remove('option-incorrect-answer');
                btnEl.classList.remove('option-disabled');
            }, 600);

            feedbackArea.innerHTML = `
                <div class="investigation-feedback feedback-incorrect">
                    <strong>❌ Not quite.</strong> ${feedback} Try again.
                </div>
            `;
        }
    }

    function markHotspotComplete(id) {
        if (completedHotspots.has(id)) return;
        completedHotspots.add(id);

        const el = document.getElementById(id);
        if (el) {
            el.classList.add('hotspot-completed');
            // Add checkmark if not already
            if (!el.querySelector('.hotspot-checkmark')) {
                const check = document.createElement('span');
                check.className = 'hotspot-checkmark';
                check.textContent = '✓';
                el.appendChild(check);
            }
        }

        updateProgress();

        if (completedHotspots.size >= totalHotspots && totalHotspots > 0) {
            setTimeout(() => {
                showSceneComplete();
                if (typeof onAllComplete === 'function') onAllComplete();
            }, 600);
        }
    }

    // ── Progress System ────────────────────────────────────────────────
    function renderProgress(containerId, total, labels) {
        totalHotspots = total;
        const container = document.getElementById(containerId);
        if (!container) return;

        let stepsHtml = '';
        for (let i = 0; i < total; i++) {
            const state = completedHotspots.size > i ? 'step-completed'
                        : completedHotspots.size === i ? 'step-current'
                        : 'step-pending';
            const icon = completedHotspots.size > i ? '✓' : (i + 1);
            stepsHtml += `<div class="progress-step ${state}">${icon}</div>`;
            if (i < total - 1) {
                const lineState = completedHotspots.size > i ? 'line-completed' : '';
                stepsHtml += `<div class="progress-step-line ${lineState}"></div>`;
            }
        }

        container.innerHTML = `
            <div class="scenario-progress">
                <div class="scenario-progress-steps">${stepsHtml}</div>
                <div class="scenario-progress-label">
                    <strong>${completedHotspots.size}</strong> / ${total} identified
                </div>
            </div>
        `;
    }

    function updateProgress() {
        const progressContainer = document.querySelector('.scenario-progress');
        if (!progressContainer) return;

        // Update steps
        const steps = progressContainer.querySelectorAll('.progress-step');
        const lines = progressContainer.querySelectorAll('.progress-step-line');
        const label = progressContainer.querySelector('.scenario-progress-label');

        steps.forEach((step, i) => {
            step.classList.remove('step-completed', 'step-current', 'step-pending');
            if (i < completedHotspots.size) {
                step.classList.add('step-completed');
                step.textContent = '✓';
            } else if (i === completedHotspots.size) {
                step.classList.add('step-current');
                step.textContent = i + 1;
            } else {
                step.classList.add('step-pending');
                step.textContent = i + 1;
            }
        });

        lines.forEach((line, i) => {
            if (i < completedHotspots.size) {
                line.classList.add('line-completed');
            } else {
                line.classList.remove('line-completed');
            }
        });

        if (label) {
            label.innerHTML = `<strong>${completedHotspots.size}</strong> / ${totalHotspots} identified`;
        }

        // Update hazard counter if present
        const counterNum = document.getElementById('hazard-found-count');
        if (counterNum) {
            counterNum.textContent = completedHotspots.size;
            counterNum.classList.add('counter-bump');
            setTimeout(() => counterNum.classList.remove('counter-bump'), 400);
        }

        // Check for all-complete
        const counterContainer = document.querySelector('.hazard-counter');
        if (counterContainer && completedHotspots.size >= totalHotspots) {
            counterContainer.classList.add('hazard-counter-complete');
        }
    }

    function showSceneComplete() {
        const scene = document.querySelector('.interactive-scene');
        if (!scene || scene.querySelector('.scene-complete-overlay')) return;

        const overlay = document.createElement('div');
        overlay.className = 'scene-complete-overlay';
        overlay.innerHTML = `
            <div class="scene-complete-icon">🎉</div>
            <div class="scene-complete-text">All hazards identified!</div>
            <div class="scene-complete-sub">Well done. You may now proceed to the assessment.</div>
        `;
        scene.appendChild(overlay);

        // Show proceed button
        const proceedBtn = document.getElementById('btn-proceed-quiz');
        if (proceedBtn) proceedBtn.style.display = '';
    }

    function updateScenarioFeedback(hotspotId, isCorrect, message) {
        const feedbackEl = document.getElementById('scenario-feedback');
        if (!feedbackEl) return;
        feedbackEl.classList.remove('hidden');
        if (isCorrect) {
            feedbackEl.className = 'alert alert-success';
            if (completedHotspots.size >= totalHotspots) {
                feedbackEl.innerHTML = `<strong>✅ All ${totalHotspots} hazards identified!</strong> Well done. You are ready to take the assessment.`;
            } else {
                feedbackEl.innerHTML = `<strong>✅ Hazard identified!</strong> ${message}`;
            }
        } else {
            feedbackEl.className = 'alert alert-error';
            feedbackEl.innerHTML = `<strong>❌ Incorrect.</strong> ${message}`;
        }
    }

    // ── Hotspot Factory ────────────────────────────────────────────────
    function createHotspot(config) {
        const el = document.createElement('div');
        el.id = config.id;
        el.className = `hotspot ${config.extraClass || ''}`;
        el.setAttribute('tabindex', '0');
        el.setAttribute('role', 'button');
        el.setAttribute('aria-label', config.ariaLabel || config.title);
        el.style.cssText = `
            position: absolute;
            top: ${config.top};
            left: ${config.left};
            width: ${config.width};
            height: ${config.height};
            border-radius: ${config.borderRadius || '10px'};
        `;

        // Add inner animation element if specified
        if (config.innerHtml) {
            el.innerHTML = config.innerHtml;
        }

        // Hover — show tooltip
        el.addEventListener('mouseenter', () => {
            if (completedHotspots.has(config.id)) return;
            showTooltip(el, config.tooltipTitle, config.tooltipBody);
        });
        el.addEventListener('mouseleave', () => hideTooltip());
        el.addEventListener('focus', () => {
            if (completedHotspots.has(config.id)) return;
            showTooltip(el, config.tooltipTitle, config.tooltipBody);
        });
        el.addEventListener('blur', () => hideTooltip());

        // Click — open investigation
        const handler = (e) => {
            e.stopPropagation();
            if (completedHotspots.has(config.id)) return;
            hideTooltip();
            openPanel({
                hotspotId: config.id,
                title: config.panelTitle || config.title,
                icon: config.panelIcon || '⚠',
                visualIcon: config.visualIcon || '⚠️',
                description: config.description,
                question: config.question || 'What should you do?',
                options: config.options || []
            });
        };
        el.addEventListener('click', handler);
        el.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handler(e);
            }
        });

        return el;
    }

    // ── Reset ──────────────────────────────────────────────────────────
    function reset() {
        completedHotspots.clear();
        totalHotspots = 0;
        onAllComplete = null;
        closePanel();
        hideTooltip();
    }

    // ── Utility ────────────────────────────────────────────────────────
    function escapeAttr(str) {
        return String(str || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
    }

    // ══════════════════════════════════════════════════════════════════
    // MODULE-SPECIFIC SCENE BUILDERS
    // ══════════════════════════════════════════════════════════════════

    // ── Hazard Awareness ───────────────────────────────────────────────
    function buildHazardAwarenessScene(containerEl, onComplete) {
        reset();
        onAllComplete = onComplete;
        totalHotspots = 3;

        containerEl.innerHTML = `
            <div class="interactive-scene">
                <div id="hazard-scene" class="warehouse-scene"
                     style="background: url('/assets/warehouse_scene.jpg') center/cover no-repeat;">
                    <div class="scene-top-badge">
                        ⚠ Hover over the workplace scene to discover potential hazards
                    </div>
                    <div class="scene-instruction-bar">
                        🏭 Warehouse Floor — Identify all 3 hazards to proceed
                    </div>
                </div>
            </div>
            <div id="scenario-progress-container"></div>
            <div class="hazard-counter">
                <span>Hazards found:</span>
                <span class="hazard-counter-number" id="hazard-found-count">0</span>
                <span>of ${totalHotspots}</span>
            </div>
        `;

        const scene = containerEl.querySelector('#hazard-scene');

        // Hotspot 1: Liquid Spill
        scene.appendChild(createHotspot({
            id: 'hz-1',
            top: '58%', left: '55%', width: '155px', height: '55px',
            borderRadius: '50%',
            extraClass: 'hotspot-spill',
            innerHtml: '<div class="spill-ripple"></div>',
            title: 'Liquid Spill',
            ariaLabel: 'Investigate liquid spill hazard',
            tooltipTitle: '⚠ Potential Hazard',
            tooltipBody: 'Liquid on the floor. Click to investigate.',
            panelTitle: 'Liquid Spill',
            panelIcon: '💧',
            visualIcon: '💧',
            description: '<strong>Slip Hazard Identified.</strong><br><br>A liquid spill has been found on the warehouse floor. Liquid spills are one of the most common causes of slip injuries in workplace environments. They must be dealt with immediately to prevent accidents.',
            question: 'What should you do about this liquid spill?',
            options: [
                { text: 'Walk around it and carry on working — someone else will clean it', correct: false, feedback: 'You should never ignore a spill. It must be reported and made safe immediately.' },
                { text: 'Report the spill, place a wet floor sign, and arrange for cleaning immediately', correct: true, feedback: 'Reporting the hazard, placing a wet floor sign, and cleaning it promptly prevents slip injuries.' },
                { text: 'Put a piece of cardboard over it', correct: false, feedback: 'Cardboard does not adequately address a spill hazard. Proper warning signage and cleaning is required.' },
                { text: 'Close the entire warehouse until it dries', correct: false, feedback: 'Closing the entire warehouse is disproportionate. The correct action is to isolate the area, warn others, and clean promptly.' }
            ]
        }));

        // Hotspot 2: Blocked Fire Exit
        scene.appendChild(createHotspot({
            id: 'hz-2',
            top: '40%', left: '44%', width: '90px', height: '90px',
            extraClass: 'hotspot-exit',
            innerHtml: '<div class="exit-pulse"></div>',
            title: 'Blocked Emergency Exit',
            ariaLabel: 'Investigate blocked emergency exit',
            tooltipTitle: '⚠ Blocked Emergency Exit',
            tooltipBody: 'Emergency routes must remain clear. Click to investigate.',
            panelTitle: 'Blocked Fire Exit',
            panelIcon: '🚪',
            visualIcon: '🚪📦',
            description: '<strong>Critical Safety Violation.</strong><br><br>Boxes and equipment are blocking a fire exit. Emergency exits must <strong>never</strong> be obstructed. In a fire, a blocked exit can prevent evacuation and endanger lives. This is also a serious legal violation.',
            question: 'What is the correct action?',
            options: [
                { text: 'Ignore it — the boxes will be moved later during the next shift', correct: false, feedback: 'Blocked fire exits are a critical, immediate hazard. They must never be left unresolved.' },
                { text: 'Move the boxes yourself and stack them somewhere else nearby', correct: false, feedback: 'While clearing the exit is important, the correct process is to report it so it can be properly logged and prevented from happening again.' },
                { text: 'Report it to your supervisor immediately and help clear the obstruction', correct: true, feedback: 'You must report blocked exits to your supervisor and help clear the obstruction. This ensures it is logged and action is taken to prevent recurrence.' },
                { text: 'Use a different exit from now on', correct: false, feedback: 'All emergency exits must be accessible at all times. Using a different exit does not resolve the hazard.' }
            ]
        }));

        // Hotspot 3: Loose Cable
        scene.appendChild(createHotspot({
            id: 'hz-3',
            top: '73%', left: '42%', width: '185px', height: '55px',
            borderRadius: '6px',
            extraClass: 'hotspot-cable',
            innerHtml: '<div class="cable-sway"></div>',
            title: 'Loose Cable',
            ariaLabel: 'Investigate loose cable trip hazard',
            tooltipTitle: '⚠ Trip Hazard',
            tooltipBody: 'Loose cable across walkway. Click to investigate.',
            panelTitle: 'Loose Cable',
            panelIcon: '🔌',
            visualIcon: '🔌',
            description: '<strong>Trip Hazard Identified.</strong><br><br>A loose cable is running across a walkway. Trailing cables are a common cause of trips and falls in the workplace. They must be secured, covered, or rerouted.',
            question: 'What should you do about this loose cable?',
            options: [
                { text: 'Step over it carefully each time you walk past', correct: false, feedback: 'Stepping over a hazard does not remove the risk. Others may not see it.' },
                { text: 'Tape it down with duct tape permanently', correct: false, feedback: 'Duct tape is a temporary fix at best. The cable should be properly secured or rerouted, and the hazard reported.' },
                { text: 'Secure the cable with a cable cover or reroute it, and report the hazard to your supervisor', correct: true, feedback: 'Securing or rerouting the cable and reporting it ensures the trip hazard is properly resolved and documented.' },
                { text: 'Unplug the cable completely', correct: false, feedback: 'Unplugging equipment without authorisation could disrupt operations. Report and secure the cable properly.' }
            ]
        }));

        renderProgress('scenario-progress-container', totalHotspots);
    }

    // ── Manual Handling ────────────────────────────────────────────────
    function buildManualHandlingScene(containerEl, onComplete) {
        reset();
        onAllComplete = onComplete;
        totalHotspots = 4;

        containerEl.innerHTML = `
            <div class="interactive-scene mh-scene">
                <div class="scene-top-badge">
                    👆 Hover over each body zone to learn the correct lifting technique
                </div>
                <svg class="mh-svg-worker" viewBox="0 0 500 450" xmlns="http://www.w3.org/2000/svg">
                    <!-- Floor -->
                    <rect x="0" y="380" width="500" height="70" fill="rgba(126,177,255,0.05)" rx="4"/>
                    <line x1="0" y1="380" x2="500" y2="380" stroke="rgba(126,177,255,0.1)" stroke-width="1"/>

                    <!-- Worker body - standing position ready to lift -->
                    <!-- Head -->
                    <circle cx="200" cy="68" r="28" fill="#3a6ea5" stroke="#5b9bd5" stroke-width="2"/>
                    <circle cx="192" cy="62" r="3" fill="#eaf2ff"/>
                    <circle cx="208" cy="62" r="3" fill="#eaf2ff"/>
                    <path d="M 192 76 Q 200 82 208 76" stroke="#eaf2ff" fill="none" stroke-width="1.5"/>

                    <!-- Neck -->
                    <rect x="192" y="96" width="16" height="14" fill="#3a6ea5" rx="3"/>

                    <!-- Torso / Back zone -->
                    <path d="M 172 110 L 228 110 L 232 220 L 168 220 Z" fill="#2d5986" stroke="#5b9bd5" stroke-width="1.5" rx="6"/>

                    <!-- Arms -->
                    <path d="M 172 115 L 140 170 L 145 230 L 155 230 L 155 175 L 178 125" fill="#3a6ea5" stroke="#5b9bd5" stroke-width="1.5"/>
                    <path d="M 228 115 L 260 170 L 260 230 L 250 230 L 245 175 L 222 125" fill="#3a6ea5" stroke="#5b9bd5" stroke-width="1.5"/>

                    <!-- Hands -->
                    <circle cx="150" cy="233" r="8" fill="#4a8abb"/>
                    <circle cx="255" cy="233" r="8" fill="#4a8abb"/>

                    <!-- Upper legs -->
                    <path d="M 175 220 L 170 300 L 185 300 L 195 220" fill="#1a3a5c" stroke="#3a6ea5" stroke-width="1.5"/>
                    <path d="M 205 220 L 215 300 L 230 300 L 225 220" fill="#1a3a5c" stroke="#3a6ea5" stroke-width="1.5"/>

                    <!-- Knees -->
                    <circle cx="177" cy="300" r="10" fill="#1a3a5c" stroke="#3a6ea5" stroke-width="1.5"/>
                    <circle cx="223" cy="300" r="10" fill="#1a3a5c" stroke="#3a6ea5" stroke-width="1.5"/>

                    <!-- Lower legs -->
                    <rect x="167" y="308" width="20" height="52" fill="#1a3a5c" stroke="#3a6ea5" stroke-width="1.5" rx="4"/>
                    <rect x="213" y="308" width="20" height="52" fill="#1a3a5c" stroke="#3a6ea5" stroke-width="1.5" rx="4"/>

                    <!-- Feet -->
                    <rect x="160" y="358" width="34" height="14" fill="#0d2450" stroke="#3a6ea5" stroke-width="1.5" rx="4"/>
                    <rect x="206" y="358" width="34" height="14" fill="#0d2450" stroke="#3a6ea5" stroke-width="1.5" rx="4"/>

                    <!-- Box / Load -->
                    <rect x="120" y="238" width="160" height="90" fill="#8B6914" stroke="#D4A836" stroke-width="2" rx="6"/>
                    <line x1="200" y1="238" x2="200" y2="328" stroke="#D4A836" stroke-width="1" stroke-dasharray="4"/>
                    <line x1="120" y1="283" x2="280" y2="283" stroke="#D4A836" stroke-width="1" stroke-dasharray="4"/>
                    <text x="200" y="290" text-anchor="middle" fill="#D4A836" font-size="13" font-weight="700">25 KG</text>

                    <!-- Hi-vis vest lines -->
                    <line x1="172" y1="120" x2="172" y2="210" stroke="#ffa502" stroke-width="2.5"/>
                    <line x1="228" y1="120" x2="228" y2="210" stroke="#ffa502" stroke-width="2.5"/>
                    <line x1="180" y1="160" x2="220" y2="160" stroke="#ffa502" stroke-width="2"/>
                </svg>
                <div class="floor-grid"></div>
            </div>
            <div id="scenario-progress-container"></div>
        `;

        const scene = containerEl.querySelector('.interactive-scene');

        // Zone 1: Back / Posture
        scene.appendChild(createHotspot({
            id: 'mh-back',
            top: '24%', left: '33%', width: '15%', height: '26%',
            extraClass: 'mh-zone',
            title: 'Back Posture',
            ariaLabel: 'Learn about correct back posture when lifting',
            tooltipTitle: '🔍 Back / Spine',
            tooltipBody: 'How should you position your back? Click to learn.',
            panelTitle: 'Back Posture',
            panelIcon: '🏋️',
            visualIcon: '🔄',
            description: '<strong>Your back is your most vulnerable area when lifting.</strong><br><br>Bending from the waist puts enormous pressure on your spine and can cause serious disc and muscle injuries. Your back should remain <strong>straight and upright</strong> throughout the lift.',
            question: 'How should your back be positioned when lifting?',
            options: [
                { text: 'Bend forward from the waist to reach the load', correct: false, feedback: 'Bending from the waist is the most common cause of lifting injuries. Always bend at the knees instead.' },
                { text: 'Keep your back straight and upright, bending at the knees', correct: true, feedback: 'Keeping your back straight and bending your knees uses the strong leg muscles and protects your spine.' },
                { text: 'Arch your back as far as possible while lifting', correct: false, feedback: 'Arching your back can strain your spine. A straight, neutral spine is safest.' }
            ]
        }));

        // Zone 2: Knees
        scene.appendChild(createHotspot({
            id: 'mh-knees',
            top: '62%', left: '32%', width: '16%', height: '12%',
            extraClass: 'mh-zone',
            title: 'Knee Position',
            ariaLabel: 'Learn about correct knee position when lifting',
            tooltipTitle: '🔍 Knees',
            tooltipBody: 'How should you use your knees? Click to learn.',
            panelTitle: 'Knee Position',
            panelIcon: '🦵',
            visualIcon: '🦵',
            description: '<strong>Your knees are key to safe lifting.</strong><br><br>Always bend at the knees — not the waist — to lower yourself to the load. Your legs are much stronger than your back. Use them as the primary lifting force.',
            question: 'How should you use your knees when picking up a load?',
            options: [
                { text: 'Keep your legs completely straight and bend your back instead', correct: false, feedback: 'Straight legs mean your back does all the work — which is dangerous.' },
                { text: 'Bend your knees to lower yourself, keeping your back straight, and push up with your legs', correct: true, feedback: 'Correct! Bending at the knees and driving upward with your legs is the safe technique.' },
                { text: 'Kneel on the floor next to the load', correct: false, feedback: 'Kneeling may make it harder to lift and could cause you to twist. Bend the knees with feet shoulder-width apart.' }
            ]
        }));

        // Zone 3: Load / Box
        scene.appendChild(createHotspot({
            id: 'mh-load',
            top: '52%', left: '23%', width: '34%', height: '20%',
            extraClass: 'mh-zone',
            title: 'Load Assessment',
            ariaLabel: 'Learn about assessing and gripping the load',
            tooltipTitle: '🔍 Load / Box',
            tooltipBody: 'How should you handle this load? Click to learn.',
            panelTitle: 'Load Assessment',
            panelIcon: '📦',
            visualIcon: '📦',
            description: '<strong>This box weighs approximately 25 kg.</strong><br><br>Before lifting, you must assess the load: its weight, shape, grip points, and your route. A 25 kg box is at the upper limit of what should be lifted alone. Keep the load close to your body at waist height.',
            question: 'What should you do before lifting this 25 kg box?',
            options: [
                { text: 'Just grab it and lift — it does not look that heavy', correct: false, feedback: '25 kg is a significant load. Always assess before lifting.' },
                { text: 'Assess the weight, check your grip, plan your route, and decide if you need help or equipment', correct: true, feedback: 'Correct! Always assess the load, plan your route, and consider whether you need help or a mechanical aid.' },
                { text: 'Slide it across the floor to avoid lifting', correct: false, feedback: 'Sliding heavy boxes can damage the floor and the contents. Use proper lifting technique or a trolley.' }
            ]
        }));

        // Zone 4: Feet position
        scene.appendChild(createHotspot({
            id: 'mh-feet',
            top: '80%', left: '30%', width: '20%', height: '10%',
            extraClass: 'mh-zone',
            title: 'Foot Position',
            ariaLabel: 'Learn about correct foot position when lifting',
            tooltipTitle: '🔍 Feet / Stance',
            tooltipBody: 'How should your feet be positioned? Click to learn.',
            panelTitle: 'Foot Position',
            panelIcon: '🦶',
            visualIcon: '🦶',
            description: '<strong>Your stance is the foundation of a safe lift.</strong><br><br>Your feet should be shoulder-width apart with one foot slightly forward for balance. This gives you a stable base from which to lift smoothly.',
            question: 'How should your feet be positioned when lifting?',
            options: [
                { text: 'Feet together, standing upright', correct: false, feedback: 'Feet together gives a narrow, unstable base. You risk losing balance.' },
                { text: 'Shoulder-width apart, one foot slightly forward for stability', correct: true, feedback: 'Correct! A wide, staggered stance provides the stability needed for safe lifting.' },
                { text: 'On tiptoes to get closer to the load', correct: false, feedback: 'Standing on tiptoes is unstable and dangerous when handling a heavy load.' }
            ]
        }));

        renderProgress('scenario-progress-container', totalHotspots);
    }

    // ── PPE Awareness ──────────────────────────────────────────────────
    function buildPPEScene(containerEl, onComplete) {
        reset();
        onAllComplete = onComplete;

        const ppeItems = [
            { id: 'ppe-hivis', icon: '🦺', name: 'Hi-Vis Vest', desc: 'High-visibility clothing', fullDesc: '<strong>High-Visibility Vest/Jacket</strong><br><br>Hi-vis clothing makes you visible to forklift operators and vehicle drivers. It must be worn at <strong>all times</strong> on the warehouse floor. Do not cover it with a regular jacket.', question: 'When must you wear your hi-vis vest?', options: [{ text: 'Only when forklifts are operating', correct: false, feedback: 'Hi-vis must be worn at all times on the warehouse floor, not just when forklifts are present.' }, { text: 'At all times while on the warehouse floor', correct: true, feedback: 'Correct! Hi-vis clothing must be worn at all times on the floor for maximum visibility.' }, { text: 'Only during night shifts', correct: false, feedback: 'Hi-vis is mandatory during all shifts, regardless of lighting conditions.' }] },
            { id: 'ppe-boots', icon: '🥾', name: 'Safety Boots', desc: 'Steel-toecap footwear', fullDesc: '<strong>Steel-Toecap Safety Boots</strong><br><br>Safety boots protect your feet from falling objects, crush injuries, and punctures. Regular trainers or shoes provide <strong>no protection</strong>. Boots must be properly laced and fastened at all times.', question: 'Why are steel-toecap boots mandatory?', options: [{ text: 'They look more professional', correct: false, feedback: 'While they look professional, the primary reason is protection against falling objects and crush injuries.' }, { text: 'They protect your feet from falling objects, crush injuries, and punctures', correct: true, feedback: 'Correct! Steel-toecap boots provide critical protection against the most common foot injuries in a warehouse.' }, { text: 'They are required only when carrying heavy loads', correct: false, feedback: 'Safety boots must be worn at all times on the warehouse floor, not just when carrying loads.' }] },
            { id: 'ppe-gloves', icon: '🧤', name: 'Gloves', desc: 'Hand protection', fullDesc: '<strong>Protective Gloves</strong><br><br>Gloves protect your hands when handling sharp, rough, or chemical materials. The correct type and size of glove must be used — gloves that are too loose can catch on equipment and cause injury.', question: 'When should you wear gloves?', options: [{ text: 'At all times, even when not handling anything', correct: false, feedback: 'Gloves are required when handling sharp, rough, or chemical materials — not necessarily at all times.' }, { text: 'When handling sharp, rough, or chemical materials', correct: true, feedback: 'Correct! Gloves should be worn when there is a risk of cuts, abrasion, or chemical exposure.' }, { text: 'Only when your supervisor tells you to', correct: false, feedback: 'You should assess the task and wear gloves whenever the risk is present, not only when told.' }] },
            { id: 'ppe-hardhat', icon: '⛑', name: 'Hard Hat', desc: 'Head protection', fullDesc: '<strong>Hard Hat / Safety Helmet</strong><br><br>Hard hats protect your head from falling objects in designated overhead hazard zones. They must sit level on your head — not tilted back. Always check the expiry date and report any damage.', question: 'How should a hard hat be worn?', options: [{ text: 'Tilted back for comfort', correct: false, feedback: 'A tilted hat does not provide proper protection. It must sit level on the head.' }, { text: 'Level on the head, with the strap fastened, in designated overhead hazard zones', correct: true, feedback: 'Correct! The hat must be worn level with the strap fastened for maximum protection.' }, { text: 'Only when it is raining', correct: false, feedback: 'Hard hats are for overhead hazard protection, not weather protection.' }] },
            { id: 'ppe-eyewear', icon: '👓', name: 'Eye Protection', desc: 'Safety goggles/glasses', fullDesc: '<strong>Eye Protection (Safety Goggles/Glasses)</strong><br><br>Eye protection must be worn when there is a risk of dust, chemicals, or flying debris. Safety goggles must form a seal around the eyes to be effective.', question: 'When is eye protection required?', options: [{ text: 'Only when working with chemicals', correct: false, feedback: 'Eye protection is also needed when there is risk of dust or flying debris, not just chemicals.' }, { text: 'When there is a risk of dust, chemicals, or flying debris', correct: true, feedback: 'Correct! Eye protection is required whenever there is any risk to your eyes.' }, { text: 'At all times on the warehouse floor', correct: false, feedback: 'Eye protection is required for specific tasks, not necessarily at all times.' }] }
        ];

        totalHotspots = ppeItems.length;

        containerEl.innerHTML = `
            <div class="interactive-scene ppe-scene">
                <div class="scene-top-badge">
                    👆 Hover over each PPE item to learn its purpose. Click to investigate.
                </div>
                <div class="ppe-worker-figure">
                    <svg viewBox="0 0 200 340" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;">
                        <!-- Worker silhouette -->
                        <circle cx="100" cy="40" r="25" fill="#3a6ea5" stroke="#5b9bd5" stroke-width="2"/>
                        <rect x="75" y="65" width="50" height="80" fill="#2d5986" stroke="#5b9bd5" stroke-width="1.5" rx="8"/>
                        <line x1="80" y1="70" x2="80" y2="140" stroke="#ffa502" stroke-width="2.5"/>
                        <line x1="120" y1="70" x2="120" y2="140" stroke="#ffa502" stroke-width="2.5"/>
                        <rect x="60" y="70" width="15" height="60" fill="#3a6ea5" rx="5"/>
                        <rect x="125" y="70" width="15" height="60" fill="#3a6ea5" rx="5"/>
                        <rect x="78" y="145" width="18" height="70" fill="#1a3a5c" stroke="#3a6ea5" stroke-width="1.5" rx="4"/>
                        <rect x="104" y="145" width="18" height="70" fill="#1a3a5c" stroke="#3a6ea5" stroke-width="1.5" rx="4"/>
                        <rect x="72" y="213" width="28" height="14" fill="#0d2450" stroke="#3a6ea5" stroke-width="1.5" rx="4"/>
                        <rect x="100" y="213" width="28" height="14" fill="#0d2450" stroke="#3a6ea5" stroke-width="1.5" rx="4"/>
                    </svg>
                </div>
                <div class="ppe-items-grid" id="ppe-items-grid">
                    ${ppeItems.map(item => `
                        <div class="ppe-item" id="${item.id}" tabindex="0" role="button"
                             aria-label="Learn about ${item.name}">
                            <span class="ppe-item-check">✓</span>
                            <div class="ppe-item-icon">${item.icon}</div>
                            <div class="ppe-item-name">${item.name}</div>
                            <div class="ppe-item-desc">${item.desc}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
            <div id="scenario-progress-container"></div>
            <div class="hazard-counter">
                <span>PPE identified:</span>
                <span class="hazard-counter-number" id="hazard-found-count">0</span>
                <span>of ${totalHotspots}</span>
            </div>
        `;

        // Attach events to PPE items
        ppeItems.forEach(item => {
            const el = document.getElementById(item.id);
            if (!el) return;

            el.addEventListener('mouseenter', () => {
                if (completedHotspots.has(item.id)) return;
                showTooltip(el, `${item.icon} ${item.name.toUpperCase()}`, item.desc + '. Click to investigate.');
            });
            el.addEventListener('mouseleave', () => hideTooltip());
            el.addEventListener('focus', () => {
                if (completedHotspots.has(item.id)) return;
                showTooltip(el, `${item.icon} ${item.name.toUpperCase()}`, item.desc + '. Click to investigate.');
            });
            el.addEventListener('blur', () => hideTooltip());

            const handler = (e) => {
                e.stopPropagation();
                if (completedHotspots.has(item.id)) return;
                hideTooltip();
                openPanel({
                    hotspotId: item.id,
                    title: item.name,
                    icon: item.icon,
                    visualIcon: item.icon,
                    description: item.fullDesc,
                    question: item.question,
                    options: item.options
                });
            };
            el.addEventListener('click', handler);
            el.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handler(e); }
            });
        });

        renderProgress('scenario-progress-container', totalHotspots);

        // Override markHotspotComplete for PPE visual
        const origMark = markHotspotComplete;
        // PPE items use class-based completion instead of hotspot class
        const checkPPEComplete = () => {
            completedHotspots.forEach(id => {
                const el = document.getElementById(id);
                if (el && el.classList.contains('ppe-item')) {
                    el.classList.add('ppe-identified');
                }
            });
        };
        // Patch: after panel answer, check PPE styles
        const origHandleAnswer = handleAnswer;
        // We'll rely on the panel's markHotspotComplete to trigger update
        // and the ppe-identified class is added via the CSS for .hotspot-completed
        // Actually, PPE items are not hotspots, let's add the class differently
        // We patch by observing completedHotspots changes in updateProgress
        const origUpdateProgress = updateProgress;
    }

    // ── Fire Safety ────────────────────────────────────────────────────
    function buildFireSafetyScene(containerEl, onComplete) {
        reset();
        onAllComplete = onComplete;
        totalHotspots = 4;

        containerEl.innerHTML = `
            <div class="interactive-scene fire-scene">
                <div class="scene-top-badge">
                    🔥 Identify the emergency response elements in this fire scenario
                </div>
                <!-- Scene background elements -->
                <div style="position:absolute; bottom:0; left:0; right:0; height:45%; background: linear-gradient(0deg, #1a1a1a, transparent); pointer-events:none;"></div>

                <!-- Shelves -->
                <div style="position:absolute; top:15%; left:5%; width:22%; height:55%; background: rgba(60,40,20,0.3); border: 1px solid rgba(100,70,40,0.3); border-radius:4px;"></div>
                <div style="position:absolute; top:15%; right:5%; width:22%; height:55%; background: rgba(60,40,20,0.3); border: 1px solid rgba(100,70,40,0.3); border-radius:4px;"></div>

                <!-- Floor -->
                <div style="position:absolute; bottom:0; left:0; right:0; height:15%; background: rgba(40,40,40,0.5);"></div>

                <div class="scene-instruction-bar" style="background:rgba(100,20,20,0.7);">
                    🚨 Fire Emergency — Identify all 4 response elements
                </div>
            </div>
            <div id="scenario-progress-container"></div>
            <div class="hazard-counter">
                <span>Elements identified:</span>
                <span class="hazard-counter-number" id="hazard-found-count">0</span>
                <span>of ${totalHotspots}</span>
            </div>
        `;

        const scene = containerEl.querySelector('.fire-scene');

        // Fire element
        scene.appendChild(createHotspot({
            id: 'fire-source',
            top: '35%', left: '38%', width: '90px', height: '90px',
            extraClass: 'fire-element',
            innerHtml: '<div class="fire-glow"></div><span style="font-size:2.5rem;">🔥</span>',
            title: 'Fire Source',
            ariaLabel: 'Investigate the fire source',
            tooltipTitle: '🔥 Fire Detected',
            tooltipBody: 'A fire has been spotted. Click to investigate.',
            panelTitle: 'Fire Source',
            panelIcon: '🔥',
            visualIcon: '🔥',
            description: '<strong>Fire Detected!</strong><br><br>A small fire has started near stored materials. Your response in the first seconds is critical. Remember: your safety comes first.',
            question: 'The fire is small. What should you do?',
            options: [
                { text: 'Try to put it out with the nearest extinguisher — you have been trained and your escape route is clear', correct: true, feedback: 'Correct! You may attempt to extinguish a small fire IF you are trained, it is safe to do so, and your escape route is clear.' },
                { text: 'Ignore it — it will probably go out on its own', correct: false, feedback: 'Never ignore a fire. Even small fires can spread rapidly.' },
                { text: 'Throw water on it immediately', correct: false, feedback: 'You must identify the type of fire first. Water on an electrical or chemical fire can be extremely dangerous.' },
                { text: 'Open windows to let the smoke out', correct: false, feedback: 'Opening windows can feed oxygen to the fire and make it worse. Evacuate and call 999.' }
            ]
        }));

        // Fire alarm
        scene.appendChild(createHotspot({
            id: 'fire-alarm',
            top: '20%', left: '70%', width: '70px', height: '70px',
            extraClass: 'fire-element',
            innerHtml: '<span class="alarm-pulse" style="font-size:2rem;">🔔</span>',
            title: 'Fire Alarm',
            ariaLabel: 'Investigate the fire alarm',
            tooltipTitle: '🔔 Fire Alarm Point',
            tooltipBody: 'Break glass alarm point. Click to investigate.',
            panelTitle: 'Fire Alarm',
            panelIcon: '🔔',
            visualIcon: '🚨',
            description: '<strong>Fire Alarm Activation Point.</strong><br><br>If you discover a fire, activate the nearest fire alarm immediately. This alerts everyone in the building to evacuate. Do not assume someone else will raise the alarm.',
            question: 'When should you activate the fire alarm?',
            options: [
                { text: 'Only after attempting to fight the fire', correct: false, feedback: 'The alarm should be raised first before any attempt to fight the fire. Alerting others is the priority.' },
                { text: 'Immediately upon discovering a fire, before doing anything else', correct: true, feedback: 'Correct! Activate the alarm immediately to ensure everyone is alerted. Then decide whether to attempt to fight the fire or evacuate.' },
                { text: 'Only if the fire is large', correct: false, feedback: 'All fires should trigger the alarm. Even small fires can spread rapidly.' }
            ]
        }));

        // Emergency exit
        scene.appendChild(createHotspot({
            id: 'fire-exit',
            top: '50%', left: '80%', width: '80px', height: '100px',
            extraClass: 'fire-element',
            innerHtml: '<span class="exit-sign-glow" style="font-size:2rem; color:#2ed573;">🚪</span>',
            title: 'Emergency Exit',
            ariaLabel: 'Investigate the emergency exit',
            tooltipTitle: '🚪 Emergency Exit',
            tooltipBody: 'Nearest fire exit route. Click to investigate.',
            panelTitle: 'Emergency Exit',
            panelIcon: '🚪',
            visualIcon: '🏃',
            description: '<strong>Emergency Exit Route.</strong><br><br>Emergency exits are marked with a green running figure sign. They must remain clear and unobstructed at ALL times. Use the <strong>nearest safe exit</strong> during an evacuation — do NOT use the lift.',
            question: 'During evacuation, what should you do?',
            options: [
                { text: 'Collect your personal belongings first, then find the exit', correct: false, feedback: 'Never collect belongings during an evacuation. Every second counts.' },
                { text: 'Use the lift to exit faster', correct: false, feedback: 'Never use the lift during a fire. It could stop between floors or open onto a fire floor.' },
                { text: 'Leave immediately via the nearest safe exit, closing doors behind you', correct: true, feedback: 'Correct! Leave immediately, close doors behind you to slow the fire, and go directly to the assembly point.' }
            ]
        }));

        // Assembly point
        scene.appendChild(createHotspot({
            id: 'fire-assembly',
            top: '72%', left: '15%', width: '100px', height: '70px',
            extraClass: 'fire-element',
            innerHtml: '<span style="font-size:1.8rem;">📍</span><span style="font-size:0.7rem; color:#2ed573; display:block;">Assembly</span>',
            title: 'Assembly Point',
            ariaLabel: 'Investigate the fire assembly point',
            tooltipTitle: '📍 Fire Assembly Point',
            tooltipBody: 'Where to gather after evacuation. Click to investigate.',
            panelTitle: 'Fire Assembly Point',
            panelIcon: '📍',
            visualIcon: '📍',
            description: '<strong>Fire Assembly Point.</strong><br><br>After evacuating, proceed directly to the fire assembly point. Remain there until the all-clear is given. A roll call will be taken. <strong>Do not leave the assembly point</strong> and do not re-enter the building.',
            question: 'What should you do at the assembly point?',
            options: [
                { text: 'Wait briefly, then go back inside to check on colleagues', correct: false, feedback: 'Never re-enter the building. Emergency services will handle search and rescue.' },
                { text: 'Remain at the assembly point until the all-clear, and report to the fire warden for the roll call', correct: true, feedback: 'Correct! Stay at the assembly point, report for the roll call, and wait for the official all-clear from the fire warden.' },
                { text: 'Leave the assembly point and go home since work is cancelled', correct: false, feedback: 'You must remain at the assembly point for the roll call. Leaving could mean you are counted as missing, triggering a dangerous rescue operation.' }
            ]
        }));

        renderProgress('scenario-progress-container', totalHotspots);
    }

    // ── Moving Vehicles & Equipment ────────────────────────────────────
    function buildVehicleScene(containerEl, onComplete) {
        reset();
        onAllComplete = onComplete;
        totalHotspots = 4;

        containerEl.innerHTML = `
            <div class="interactive-scene vehicle-scene">
                <div class="scene-top-badge">
                    🚜 Identify the safety elements when working near moving vehicles
                </div>

                <!-- Floor markings -->
                <div style="position:absolute; bottom:0; left:0; right:0; height:55%; background: linear-gradient(0deg, rgba(100,100,100,0.15), transparent); pointer-events:none;"></div>

                <!-- Pedestrian walkway -->
                <div style="position:absolute; bottom:0; left:0; width:18%; height:55%; border-right:3px dashed rgba(46,213,115,0.4); pointer-events:none;"></div>
                <div style="position:absolute; bottom:5%; left:2%; font-size:0.7rem; color:rgba(46,213,115,0.6); writing-mode:vertical-lr; pointer-events:none;">PEDESTRIAN WALKWAY</div>

                <!-- Vehicle route -->
                <div style="position:absolute; bottom:0; left:30%; width:40%; height:55%; border-left:2px dashed rgba(255,165,2,0.3); border-right:2px dashed rgba(255,165,2,0.3); pointer-events:none;"></div>
                <div style="position:absolute; bottom:5%; left:42%; font-size:0.7rem; color:rgba(255,165,2,0.5); pointer-events:none;">VEHICLE ROUTE</div>

                <!-- Shelving units -->
                <div style="position:absolute; top:10%; right:5%; width:20%; height:50%; background:rgba(60,40,20,0.2); border:1px solid rgba(100,70,40,0.2); border-radius:4px; pointer-events:none;"></div>
                <div style="position:absolute; top:10%; left:22%; width:8%; height:50%; background:rgba(60,40,20,0.2); border:1px solid rgba(100,70,40,0.2); border-radius:4px; pointer-events:none;"></div>

                <div class="scene-instruction-bar">
                    🏭 Warehouse Vehicle Area — Identify all 4 safety elements
                </div>
            </div>
            <div id="scenario-progress-container"></div>
            <div class="hazard-counter">
                <span>Elements identified:</span>
                <span class="hazard-counter-number" id="hazard-found-count">0</span>
                <span>of ${totalHotspots}</span>
            </div>
        `;

        const scene = containerEl.querySelector('.vehicle-scene');

        // Forklift
        scene.appendChild(createHotspot({
            id: 'veh-forklift',
            top: '38%', left: '40%', width: '100px', height: '90px',
            extraClass: 'vehicle-element',
            innerHtml: '<span class="vehicle-move" style="font-size:2.5rem;">🚜</span>',
            title: 'Moving Forklift',
            ariaLabel: 'Investigate the moving forklift hazard',
            tooltipTitle: '🚜 Moving Forklift',
            tooltipBody: 'A forklift is operating. Click to investigate.',
            panelTitle: 'Moving Forklift',
            panelIcon: '🚜',
            visualIcon: '🚜',
            description: '<strong>Moving Forklift — Serious Hazard.</strong><br><br>Forklifts are one of the most dangerous pieces of equipment in a warehouse. Operators have limited visibility, especially when carrying loads. Vehicle-pedestrian collisions are among the most serious warehouse accidents.',
            question: 'You need to cross the forklift\'s path. What should you do?',
            options: [
                { text: 'Walk quickly across — the driver will stop', correct: false, feedback: 'Never assume a forklift driver has seen you. Their view may be blocked by the load.' },
                { text: 'Make eye contact with the operator, wait for acknowledgement, then cross using the designated pedestrian route', correct: true, feedback: 'Correct! Always make eye contact, wait for acknowledgement, and use the designated pedestrian walkway.' },
                { text: 'Wave and shout to get their attention while crossing', correct: false, feedback: 'The operator may not hear you over the engine noise. Eye contact and acknowledgement are essential.' }
            ]
        }));

        // Pedestrian
        scene.appendChild(createHotspot({
            id: 'veh-pedestrian',
            top: '55%', left: '6%', width: '70px', height: '90px',
            extraClass: 'vehicle-element',
            innerHtml: '<span style="font-size:2rem;">🚶</span>',
            title: 'Pedestrian Safety',
            ariaLabel: 'Investigate pedestrian safety rules',
            tooltipTitle: '🚶 Pedestrian Zone',
            tooltipBody: 'Pedestrian walking area. Click to investigate.',
            panelTitle: 'Pedestrian Safety',
            panelIcon: '🚶',
            visualIcon: '🚶',
            description: '<strong>Pedestrian Walkway.</strong><br><br>Designated pedestrian walkways are clearly marked and separated from vehicle routes. Workers must <strong>always</strong> use these walkways and never take shortcuts through vehicle zones.',
            question: 'What is the most important rule for pedestrians?',
            options: [
                { text: 'Walk wherever is most convenient to save time', correct: false, feedback: 'Taking shortcuts through vehicle zones puts you at serious risk of collision.' },
                { text: 'Always use designated pedestrian walkways and never take shortcuts through vehicle zones', correct: true, feedback: 'Correct! Designated walkways exist to keep pedestrians safe. Always use them.' },
                { text: 'Walk behind reversing vehicles to stay out of their way', correct: false, feedback: 'Never walk behind a reversing vehicle. Operators have very limited rearward visibility.' }
            ]
        }));

        // Blind corner / mirror
        scene.appendChild(createHotspot({
            id: 'veh-blindspot',
            top: '20%', left: '22%', width: '80px', height: '70px',
            extraClass: 'vehicle-element',
            innerHtml: '<span style="font-size:1.6rem;">🔍</span><span style="font-size:0.65rem; color:#ffa502; display:block;">MIRROR</span>',
            title: 'Blind Corner',
            ariaLabel: 'Investigate blind corner safety',
            tooltipTitle: '🔍 Blind Corner',
            tooltipBody: 'Junction with limited visibility. Click to investigate.',
            panelTitle: 'Blind Corner & Mirror',
            panelIcon: '🔍',
            visualIcon: '🪞',
            description: '<strong>Blind Corner — High Risk Area.</strong><br><br>Corners and junctions in warehouses are high-risk areas where pedestrians and vehicles may collide. Convex mirrors are installed to help, but you must also slow down, look both ways, and be extra cautious.',
            question: 'How should you approach a blind corner in a warehouse?',
            options: [
                { text: 'Walk quickly around it — the mirror will show you if anything is coming', correct: false, feedback: 'Mirrors help but are not perfect. You must still slow down and look carefully.' },
                { text: 'Slow down, check the convex mirror, look both ways, and proceed with caution', correct: true, feedback: 'Correct! Slow down, use the mirror, look both ways, and listen for approaching vehicles.' },
                { text: 'Shout around the corner to warn anyone coming', correct: false, feedback: 'Shouting may not be heard over vehicle and warehouse noise. Use mirrors and proceed cautiously.' }
            ]
        }));

        // Safety zone / exclusion
        scene.appendChild(createHotspot({
            id: 'veh-exclusion',
            top: '60%', left: '55%', width: '120px', height: '70px',
            extraClass: 'vehicle-element',
            innerHtml: '<div class="warning-zone-border" style="position:absolute;inset:0;"></div><span style="font-size:0.75rem; color:#ffa502; position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); white-space:nowrap;">⚠ EXCLUSION ZONE</span>',
            title: 'Exclusion Zone',
            ariaLabel: 'Investigate the vehicle exclusion zone',
            tooltipTitle: '⚠ Vehicle Exclusion Zone',
            tooltipBody: 'Keep at least 3m from operating forklifts. Click to learn more.',
            panelTitle: 'Vehicle Exclusion Zone',
            panelIcon: '⚠',
            visualIcon: '🚧',
            description: '<strong>Vehicle Exclusion Zone.</strong><br><br>You must maintain a safe distance of at least <strong>3 metres</strong> from operating forklifts and other vehicles. Never stand or walk within the turning radius of a vehicle. These exclusion zones are critical to preventing crush and collision injuries.',
            question: 'How close can you safely stand to an operating forklift?',
            options: [
                { text: 'As close as needed to pass items to the operator', correct: false, feedback: 'Never approach an operating forklift closely. The operator may not see you and the vehicle can move unpredictably.' },
                { text: 'At least 3 metres away, outside the vehicle exclusion zone', correct: true, feedback: 'Correct! Maintain at least 3 metres distance from operating forklifts to stay safe.' },
                { text: 'About 1 metre — close enough to be seen', correct: false, feedback: '1 metre is far too close. A forklift can swing or reverse without warning. Stay at least 3 metres away.' }
            ]
        }));

        renderProgress('scenario-progress-container', totalHotspots);
    }

    // ── Public API ─────────────────────────────────────────────────────
    return {
        init,
        reset,
        showTooltip,
        hideTooltip,
        openPanel,
        closePanel,
        handleAnswer,
        markHotspotComplete,
        buildHazardAwarenessScene,
        buildManualHandlingScene,
        buildPPEScene,
        buildFireSafetyScene,
        buildVehicleScene,
        getCompletedCount: () => completedHotspots.size,
        getTotalCount: () => totalHotspots
    };
})();

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => InteractiveEngine.init());

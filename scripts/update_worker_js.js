const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../public/js/worker.js');
let code = fs.readFileSync(filePath, 'utf8');

const startMarker = 'function renderScenarioForModule(title) {';
const endMarker = 'let hazardsFound = new Set();';

const startIndex = code.indexOf(startMarker);
const endIndex = code.indexOf(endMarker);

if (startIndex === -1 || endIndex === -1) {
    console.error('Markers not found!');
    process.exit(1);
}

const newFunction = `function renderScenarioForModule(title) {
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
        scenarioEl.innerHTML = \`
            <div style="text-align:center; padding:30px;">
                <p style="margin-bottom:20px;">You have reviewed the training content for this module.</p>
                <button class="btn btn-success" onclick="document.getElementById('btn-proceed-quiz').style.display=''; document.getElementById('scenario-feedback').classList.add('hidden')">Ready for Assessment</button>
            </div>
        \`;
        document.getElementById('btn-proceed-quiz').style.display = '';
    }
}

`;

code = code.substring(0, startIndex) + newFunction + code.substring(endIndex);
fs.writeFileSync(filePath, code, 'utf8');
console.log('Successfully updated renderScenarioForModule in worker.js');

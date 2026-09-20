const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');

const dbPath = path.join(__dirname, '../database/database.sqlite');
const schemaPath = path.join(__dirname, '../database/schema.sql');

if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath); // Delete existing DB to reset
}

const db = new sqlite3.Database(dbPath);

const schema = fs.readFileSync(schemaPath, 'utf8');

db.exec(schema, async (err) => {
    if (err) {
        console.error('Error executing schema:', err.message);
        process.exit(1);
    }
    console.log('Database schema created successfully.');

    try {
        await seedDatabase();
    } catch (e) {
        console.error('Error seeding database:', e);
    } finally {
        db.close();
    }
});

async function seedDatabase() {
    const run = (sql, params = []) => new Promise((resolve, reject) => {
        db.run(sql, params, function(err) {
            if (err) reject(err);
            else resolve(this);
        });
    });

    const get = (sql, params = []) => new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });

    console.log('Seeding roles...');
    await run("INSERT INTO roles (name) VALUES ('Worker'), ('Supervisor'), ('Administrator')");
    
    console.log('Seeding departments...');
    await run("INSERT INTO departments (name) VALUES ('Warehouse floor'), ('Agency / nights'), ('Inbound / receiving'), ('Dispatch'), ('Management')");

    console.log('Seeding shifts...');
    await run("INSERT INTO shifts (name) VALUES ('Day'), ('Night')");

    console.log('Seeding users...');
    
    // Admin
    const adminHash = await bcrypt.hash('Admin@2026', 10);
    await run(`INSERT INTO users (first_name, last_name, email, password_hash, role_id, department_id, shift_id) 
               VALUES ('Admin', 'User', 'admin@northgate.com', ?, 3, 5, 1)`, [adminHash]);
    
    // Supervisor
    const supHash = await bcrypt.hash('SarahSup!123', 10);
    await run(`INSERT INTO users (first_name, last_name, email, password_hash, role_id, department_id, shift_id) 
               VALUES ('Sarah', 'Supervisor', 'sarah.s@northgate.com', ?, 2, 5, 1)`, [supHash]);
               
    // Workers
    const workers = [
        ['Alex', 'Kumar', 'alex.k@northgate.com', 'AlexK_pass1', 1, 1],
        ['Sam', 'Patel', 'sam.p@northgate.com', 'SamP_pass2', 1, 1],
        ['Riley', 'Chen', 'riley.c@northgate.com', 'RileyC_pass3', 1, 1],
        ['Taylor', 'Morgan', 'taylor.m@northgate.com', 'TaylorM_pass4', 2, 2],
        ['Priya', 'Shah', 'priya.s@northgate.com', 'PriyaS_pass5', 3, 1],
        ['Chris', 'Wilson', 'chris.w@northgate.com', 'ChrisW_pass6', 4, 1]
    ];

    for (const w of workers) {
        const workerHash = await bcrypt.hash(w[3], 10);
        await run(`INSERT INTO users (first_name, last_name, email, password_hash, role_id, department_id, shift_id) 
                   VALUES (?, ?, ?, ?, 1, ?, ?)`, [w[0], w[1], w[2], workerHash, w[4], w[5]]);
    }

    console.log('Seeding modules...');
    const modules = [
        ['Manual Handling', 'Learn safe lifting techniques, risk assessment, and correct posture.'],
        ['Hazard Awareness', 'Identify workplace hazards, slips, trips, and forklift routes.'],
        ['Personal Protective Equipment', 'Understand PPE selection, inspection, and correct usage.'],
        ['Fire Safety', 'Learn fire risk recognition, evacuation procedures, and safe responses.'],
        ['Forklift Safety Basics', 'Essential safety rules for operating and working near forklifts.']
    ];
    
    for (const m of modules) {
        await run(`INSERT INTO modules (title, description) VALUES (?, ?)`, [m[0], m[1]]);
    }

    console.log('Seeding training assignments...');
    const seededWorkers = await new Promise((resolve, reject) => db.all(`SELECT id, first_name FROM users WHERE role_id = 1`, [], (error, rows) => error ? reject(error) : resolve(rows)));
    const seededModules = await new Promise((resolve, reject) => db.all(`SELECT id, title FROM modules WHERE is_active = 1`, [], (error, rows) => error ? reject(error) : resolve(rows)));
    
    for (const worker of seededWorkers) {
        for (const moduleItem of seededModules) {
            let status = 'Not started';
            let score = null;
            let dueDate = `date('now', '+30 day')`;
            let completedDate = null;

            // Alex Kumar: Completed Manual Handling
            if (worker.first_name === 'Alex' && moduleItem.title === 'Manual Handling') {
                status = 'Passed';
                score = 85;
                completedDate = `date('now', '-2 day')`;
            }
            // Sam Patel: In Progress Hazard Awareness
            else if (worker.first_name === 'Sam' && moduleItem.title === 'Hazard Awareness') {
                status = 'In Progress';
            }
            // Riley Chen: Not Started PPE
            else if (worker.first_name === 'Riley' && moduleItem.title === 'Personal Protective Equipment') {
                status = 'Not started';
            }
            // Taylor Morgan: Overdue Fire Safety
            else if (worker.first_name === 'Taylor' && moduleItem.title === 'Fire Safety') {
                status = 'Overdue';
                dueDate = `date('now', '-5 day')`;
            }
            // Randomize some others just for realistic bulk data
            else if (worker.first_name === 'Chris' && moduleItem.title === 'Fire Safety') {
                status = 'Passed';
                score = 95;
                completedDate = `date('now', '-10 day')`;
            }
            else if (worker.first_name === 'Priya' && moduleItem.title === 'Manual Handling') {
                status = 'Passed';
                score = 75;
                completedDate = `date('now', '-15 day')`;
            }

            const sql = `INSERT INTO assignments (user_id, module_id, assigned_by, due_date, completed_date, status, score) 
                         VALUES (?, ?, 2, ${dueDate}, ${completedDate}, ?, ?)`;
            await run(sql, [worker.id, moduleItem.id, status, score]);

            if (status === 'Passed') {
                const row = await get(`SELECT last_insert_rowid() as id`);
                const assignId = row.id;
                const crypto = require('crypto');
                const certRef = crypto.randomBytes(6).toString('hex').toUpperCase();
                await run(`INSERT INTO certificates (assignment_id, certificate_ref, issue_date) VALUES (?, ?, ${completedDate})`, [assignId, certRef]);
            }
        }
    }

    console.log('Seeding questions and options...');
    
    const manualHandlingQuestions = [
        { q: 'What is the first step before lifting a heavy load?', options: ['Lift immediately', 'Assess the weight and route', 'Ask a colleague to lift it for you', 'Drag it across the floor'], correctIndex: 1, explanation: 'Always assess the load and your route before attempting to lift.' },
        { q: 'Which part of your body should do most of the work when lifting?', options: ['Your back', 'Your arms', 'Your legs', 'Your shoulders'], correctIndex: 2, explanation: 'Bend your knees and use your strong leg muscles to lift, keeping your back straight.' },
        { q: 'When lifting a load, where should you hold it?', options: ['As far away from your body as possible', 'Close to your body, at waist height', 'Above your head', 'With one hand only'], correctIndex: 1, explanation: 'Holding the load close to your body reduces the strain on your back.' },
        { q: 'What should you do if a load is too heavy or awkward to lift alone?', options: ['Try to lift it anyway', 'Use a mechanical aid or ask for help', 'Push it with your feet', 'Leave it in the middle of the aisle'], correctIndex: 1, explanation: 'Always use mechanical lifting aids or seek assistance for heavy loads.' }
    ];
    
    const hazardAwarenessQuestions = [
        { q: 'What should you do if you notice a liquid spill on the warehouse floor?', options: ['Walk around it', 'Report it and clean it if authorized', 'Ignore it, someone else will clean it', 'Place a pallet over it'], correctIndex: 1, explanation: 'Spills are major trip/slip hazards and must be reported and dealt with immediately.' },
        { q: 'Why is it important to keep aisles and emergency exits clear?', options: ['To make the warehouse look tidy', 'To allow safe passage and quick evacuation during emergencies', 'To have a place to store extra inventory', 'Because the manager said so'], correctIndex: 1, explanation: 'Clear aisles are critical for safe movement and fast emergency evacuation.' },
        { q: 'What is the best way to handle a tripping hazard like a loose cable?', options: ['Step over it', 'Secure it properly or tape it down immediately', 'Tell someone else to fix it later', 'Move it slightly to the side'], correctIndex: 1, explanation: 'Loose cables must be secured immediately to prevent tripping.' }
    ];

    const ppeQuestions = [
        { q: 'When must you wear high-visibility clothing?', options: ['Only at night', 'When operating a forklift', 'At all times on the warehouse floor', 'Only when instructed by a manager'], correctIndex: 2, explanation: 'High-vis clothing is mandatory on the warehouse floor at all times to ensure you are seen.' },
        { q: 'What should you do if your safety helmet (hard hat) sustains a heavy impact?', options: ['Keep wearing it', 'Replace it immediately, even if no damage is visible', 'Paint over any scratches', 'Give it to someone else'], correctIndex: 1, explanation: 'Hard hats must be replaced after a heavy impact as their structural integrity may be compromised.' },
        { q: 'Which type of footwear is required in the warehouse?', options: ['Sneakers', 'Open-toed sandals', 'Steel-toe safety boots', 'Slip-on shoes'], correctIndex: 2, explanation: 'Steel-toe boots protect feet from falling objects and crush injuries.' }
    ];

    const fireSafetyQuestions = [
        { q: 'What is the correct action upon hearing the fire alarm?', options: ['Finish your task', 'Investigate the cause of the fire', 'Evacuate immediately via the nearest safe exit', 'Wait for instructions'], correctIndex: 2, explanation: 'Always evacuate immediately via the nearest safe exit to the assembly point.' },
        { q: 'Where should you go after evacuating the building during a fire drill?', options: ['Your car', 'The designated assembly point', 'A nearby cafe', 'Back inside to get your belongings'], correctIndex: 1, explanation: 'You must proceed directly to the designated assembly point for roll call.' },
        { q: 'When is it appropriate for you to use a fire extinguisher?', options: ['Whenever you see a fire', 'Only if the fire is small, you are trained, and it is safe to do so', 'If you want to practice', 'Instead of calling the fire department'], correctIndex: 1, explanation: 'Only attempt to extinguish small fires if trained, confident, and your escape route is clear.' }
    ];

    const forkliftQuestions = [
        { q: 'Who is authorized to operate a forklift?', options: ['Anyone with a driver\'s license', 'Only certified and trained operators', 'Warehouse managers only', 'Any employee over 18'], correctIndex: 1, explanation: 'Only formally trained and certified personnel may operate a forklift.' },
        { q: 'When walking through the warehouse, how should you interact with a forklift?', options: ['Walk as close to it as possible', 'Assume the driver sees you', 'Make eye contact with the driver and maintain a safe distance', 'Run in front of it to pass quickly'], correctIndex: 2, explanation: 'Always make eye contact with the operator to ensure they see you before proceeding.' }
    ];

    const insertQAndA = async (moduleId, questions) => {
        for (let i = 0; i < questions.length; i++) {
            const q = questions[i];
            await run(`INSERT INTO questions (module_id, question_text, explanation, order_index) VALUES (?, ?, ?, ?)`, [moduleId, q.q, q.explanation, i]);
            const row = await get(`SELECT last_insert_rowid() as id`);
            const qId = row.id;
            for (let j = 0; j < q.options.length; j++) {
                await run(`INSERT INTO options (question_id, option_text, is_correct) VALUES (?, ?, ?)`, [qId, q.options[j], j === q.correctIndex ? 1 : 0]);
            }
        }
    };

    await insertQAndA(1, manualHandlingQuestions);
    await insertQAndA(2, hazardAwarenessQuestions);
    await insertQAndA(3, ppeQuestions);
    await insertQAndA(4, fireSafetyQuestions);
    await insertQAndA(5, forkliftQuestions);

    console.log('Database seeding completed successfully.');
}

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
        console.log('Database connection closed.');
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
    await run("INSERT INTO departments (name) VALUES ('Warehouse Floor'), ('Agency / Nights'), ('Inbound / Receiving'), ('Dispatch'), ('Management')");

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
        ['Alex',   'Kumar',   'alex.k@northgate.com',   'AlexK_pass1',   1, 1],
        ['Sam',    'Patel',   'sam.p@northgate.com',    'SamP_pass2',    1, 1],
        ['Riley',  'Chen',    'riley.c@northgate.com',  'RileyC_pass3',  1, 1],
        ['Taylor', 'Morgan',  'taylor.m@northgate.com', 'TaylorM_pass4', 2, 2],
        ['Priya',  'Shah',    'priya.s@northgate.com',  'PriyaS_pass5',  3, 1],
        ['Chris',  'Wilson',  'chris.w@northgate.com',  'ChrisW_pass6',  4, 1]
    ];

    for (const w of workers) {
        const workerHash = await bcrypt.hash(w[3], 10);
        await run(`INSERT INTO users (first_name, last_name, email, password_hash, role_id, department_id, shift_id)
                   VALUES (?, ?, ?, ?, 1, ?, ?)`, [w[0], w[1], w[2], workerHash, w[4], w[5]]);
    }

    console.log('Seeding modules...');
    // IMPORTANT: "Moving Vehicles & Equipment" — not "Forklift Safety Basics"
    const modules = [
        ['Manual Handling',               'Learn safe lifting techniques, risk assessment, and correct posture to prevent musculoskeletal injuries.',  70, 30],
        ['Hazard Awareness',              'Identify workplace hazards including slips, trips, blocked exits, and forklift routes.',                      70, 25],
        ['PPE Awareness',                 'Understand PPE selection, inspection, fitting, and correct usage for your role.',                            70, 20],
        ['Fire Safety',                   'Learn fire risk recognition, emergency alarm procedures, evacuation routes, and assembly points.',            70, 25],
        ['Moving Vehicles & Equipment',   'Essential safety rules for working near forklifts, moving vehicles, blind spots, and pedestrian routes.',     70, 25]
    ];

    for (const m of modules) {
        await run(`INSERT INTO modules (title, description, pass_mark, duration_minutes) VALUES (?, ?, ?, ?)`, m);
    }

    console.log('Seeding training assignments...');
    const seededWorkers = await new Promise((resolve, reject) =>
        db.all(`SELECT id, first_name FROM users WHERE role_id = 1`, [], (error, rows) => error ? reject(error) : resolve(rows))
    );
    const seededModules = await new Promise((resolve, reject) =>
        db.all(`SELECT id, title FROM modules WHERE is_active = 1`, [], (error, rows) => error ? reject(error) : resolve(rows))
    );

    const crypto = require('crypto');
    const supervisorId = 2; // Sarah Supervisor

    for (const worker of seededWorkers) {
        for (const moduleItem of seededModules) {
            let status = 'Not started';
            let score = null;
            let dueDateExpr = `date('now', '+30 day')`;
            let completedDateExpr = 'NULL';
            let attemptCount = 0;

            // Alex Kumar: Passed Manual Handling + PPE; Failed Hazard Awareness
            if (worker.first_name === 'Alex') {
                if (moduleItem.title === 'Manual Handling') {
                    status = 'Passed'; score = 85; dueDateExpr = `date('now', '+25 day')`; completedDateExpr = `date('now', '-2 day')`; attemptCount = 1;
                } else if (moduleItem.title === 'PPE Awareness') {
                    status = 'Passed'; score = 90; dueDateExpr = `date('now', '+20 day')`; completedDateExpr = `date('now', '-5 day')`; attemptCount = 1;
                } else if (moduleItem.title === 'Hazard Awareness') {
                    status = 'Failed'; score = 55; dueDateExpr = `date('now', '+15 day')`; completedDateExpr = 'NULL'; attemptCount = 1;
                } else if (moduleItem.title === 'Fire Safety') {
                    status = 'In Progress'; dueDateExpr = `date('now', '+10 day')`; attemptCount = 0;
                }
            }

            // Sam Patel: In Progress on some, Not Started others
            else if (worker.first_name === 'Sam') {
                if (moduleItem.title === 'Hazard Awareness') {
                    status = 'In Progress'; dueDateExpr = `date('now', '+5 day')`; attemptCount = 0;
                } else if (moduleItem.title === 'Manual Handling') {
                    status = 'Passed'; score = 78; dueDateExpr = `date('now', '+20 day')`; completedDateExpr = `date('now', '-8 day')`; attemptCount = 1;
                } else if (moduleItem.title === 'Fire Safety') {
                    // Overdue: due date in the past
                    status = 'Not started'; dueDateExpr = `date('now', '-3 day')`; attemptCount = 0;
                }
            }

            // Riley Chen: Not started on most, 1 passed
            else if (worker.first_name === 'Riley') {
                if (moduleItem.title === 'Fire Safety') {
                    status = 'Passed'; score = 92; dueDateExpr = `date('now', '+18 day')`; completedDateExpr = `date('now', '-12 day')`; attemptCount = 1;
                } else if (moduleItem.title === 'PPE Awareness') {
                    // Overdue
                    status = 'Not started'; dueDateExpr = `date('now', '-7 day')`; attemptCount = 0;
                } else if (moduleItem.title === 'Manual Handling') {
                    status = 'Not started'; dueDateExpr = `date('now', '+14 day')`; attemptCount = 0;
                }
            }

            // Taylor Morgan: Overdue Fire Safety, Passed Moving Vehicles, Failed PPE
            else if (worker.first_name === 'Taylor') {
                if (moduleItem.title === 'Fire Safety') {
                    status = 'Not started'; dueDateExpr = `date('now', '-5 day')`; attemptCount = 0;
                } else if (moduleItem.title === 'Moving Vehicles & Equipment') {
                    status = 'Passed'; score = 88; dueDateExpr = `date('now', '+22 day')`; completedDateExpr = `date('now', '-3 day')`; attemptCount = 1;
                } else if (moduleItem.title === 'PPE Awareness') {
                    status = 'Failed'; score = 60; dueDateExpr = `date('now', '+12 day')`; attemptCount = 2;
                }
            }

            // Priya Shah: Passed Manual Handling and Hazard Awareness
            else if (worker.first_name === 'Priya') {
                if (moduleItem.title === 'Manual Handling') {
                    status = 'Passed'; score = 75; dueDateExpr = `date('now', '+28 day')`; completedDateExpr = `date('now', '-15 day')`; attemptCount = 1;
                } else if (moduleItem.title === 'Hazard Awareness') {
                    status = 'Passed'; score = 82; dueDateExpr = `date('now', '+25 day')`; completedDateExpr = `date('now', '-10 day')`; attemptCount = 1;
                } else if (moduleItem.title === 'Moving Vehicles & Equipment') {
                    status = 'In Progress'; dueDateExpr = `date('now', '+8 day')`; attemptCount = 0;
                }
            }

            // Chris Wilson: Passed Fire Safety + Moving Vehicles
            else if (worker.first_name === 'Chris') {
                if (moduleItem.title === 'Fire Safety') {
                    status = 'Passed'; score = 95; dueDateExpr = `date('now', '+30 day')`; completedDateExpr = `date('now', '-10 day')`; attemptCount = 1;
                } else if (moduleItem.title === 'Moving Vehicles & Equipment') {
                    status = 'Passed'; score = 80; dueDateExpr = `date('now', '+25 day')`; completedDateExpr = `date('now', '-7 day')`; attemptCount = 1;
                } else if (moduleItem.title === 'Hazard Awareness') {
                    status = 'Not started'; dueDateExpr = `date('now', '-4 day')`; attemptCount = 0;
                }
            }

            const sql = `INSERT INTO assignments (user_id, module_id, assigned_by, due_date, completed_date, status, score, attempt_count)
                         VALUES (?, ?, ?, ${dueDateExpr}, ${completedDateExpr}, ?, ?, ?)`;
            await run(sql, [worker.id, moduleItem.id, supervisorId, status, score, attemptCount]);

            if (status === 'Passed') {
                const row = await get(`SELECT last_insert_rowid() as id`);
                const assignId = row.id;
                const certRef = crypto.randomBytes(6).toString('hex').toUpperCase();
                await run(`INSERT INTO certificates (assignment_id, certificate_ref, issue_date) VALUES (?, ?, ${completedDateExpr})`, [assignId, certRef]);
            }
        }
    }

    console.log('Seeding questions and options...');

    const manualHandlingQuestions = [
        {
            q: 'What is the FIRST step before lifting a heavy load?',
            options: ['Lift immediately before muscles cool down', 'Assess the load weight, size, and your planned route', 'Ask a colleague to lift it instead', 'Drag it across the floor to your destination'],
            correctIndex: 1,
            explanation: 'Always assess the load and your route before attempting to lift. Check for obstacles, weight, and whether you need assistance.'
        },
        {
            q: 'Which part of your body should do most of the work when lifting?',
            options: ['Your back — it is the strongest muscle', 'Your arms and shoulders', 'Your legs — bend your knees and keep your back straight', 'Your neck and upper body'],
            correctIndex: 2,
            explanation: 'Bend your knees and use your strong leg muscles to lift, keeping your back straight and upright. Never bend from the waist.'
        },
        {
            q: 'When carrying a load, where should it be held?',
            options: ['As far away from your body as possible for balance', 'Close to your body at around waist height', 'Above your head to see where you are going', 'With one hand only for agility'],
            correctIndex: 1,
            explanation: 'Holding the load close to your body reduces the leverage strain on your spine and prevents back injuries.'
        },
        {
            q: 'What should you do if a load is too heavy or awkward to lift alone?',
            options: ['Try to lift it anyway — you can manage', 'Use a mechanical aid or ask a colleague for assistance', 'Push it with your feet along the floor', 'Leave it in the middle of the aisle until the end of your shift'],
            correctIndex: 1,
            explanation: 'Always use mechanical lifting aids (trolleys, pallet trucks) or seek team assistance for heavy or awkward loads. Never risk injury.'
        },
        {
            q: 'Which posture is INCORRECT when lifting?',
            options: ['Feet shoulder-width apart for a stable base', 'Back straight throughout the lift', 'Bending from the waist with straight legs', 'Load held close to the body'],
            correctIndex: 2,
            explanation: 'Bending from the waist puts extreme pressure on the discs in your lower back. Always bend your knees, not your back.'
        }
    ];

    const hazardAwarenessQuestions = [
        {
            q: 'You notice a liquid spill on the warehouse floor. What should you do?',
            options: ['Walk around it carefully', 'Report it immediately and clean it if you are authorised to do so', 'Ignore it — someone else will deal with it', 'Place a pallet over it to cover it'],
            correctIndex: 1,
            explanation: 'Liquid spills are major slip hazards. They must be reported immediately and dealt with by placing warning signs and cleaning up.'
        },
        {
            q: 'Why is it critical to keep aisles and emergency exits clear at all times?',
            options: ['To make the warehouse look tidy for inspections', 'To allow safe movement and fast evacuation during emergencies', 'To create space for storing extra inventory temporarily', 'Because the site manager prefers it'],
            correctIndex: 1,
            explanation: 'Clear aisles and exits are life-safety requirements. Blocked exits can prevent evacuation and lead to fatalities in an emergency.'
        },
        {
            q: 'You spot a loose power cable running across a pedestrian walkway. What is the correct action?',
            options: ['Step over it every time you pass', 'Secure it with cable ties or tape it down immediately, or report it', 'Tell someone else to fix it later', 'Move it slightly to one side of the walkway'],
            correctIndex: 1,
            explanation: 'Loose cables are serious tripping hazards. They must be secured immediately or reported so they can be fixed properly.'
        },
        {
            q: 'Boxes are stacked blocking a fire exit. What do you do?',
            options: ['Leave them — the fire exit is rarely used', 'Report it to your supervisor and ensure the exit is cleared immediately', 'Move them to a different aisle', 'Stack them more neatly against the door'],
            correctIndex: 1,
            explanation: 'Fire exits must be clear at all times. A blocked fire exit is a serious legal and safety violation. Report it immediately.'
        }
    ];

    const ppeQuestions = [
        {
            q: 'When must you wear high-visibility (hi-vis) clothing on the warehouse floor?',
            options: ['Only during night shifts', 'Only when operating a forklift', 'At all times when on the warehouse floor', 'Only when your supervisor is present'],
            correctIndex: 2,
            explanation: 'High-vis clothing is mandatory at all times on the warehouse floor to ensure you are visible to forklift operators and other vehicle drivers.'
        },
        {
            q: 'Your safety helmet has just sustained a heavy impact. What should you do?',
            options: ['Continue wearing it — it looks undamaged', 'Replace it immediately, even if no visible damage is present', 'Paint over any scratches and continue use', 'Give it to a colleague who needs one'],
            correctIndex: 1,
            explanation: 'A heavy impact can compromise the structural integrity of a hard hat even without visible damage. It must be replaced immediately.'
        },
        {
            q: 'Which footwear is required when working in a warehouse environment?',
            options: ['Comfortable trainers or sneakers', 'Open-toed sandals in warm weather', 'Steel-toecap safety boots', 'Any closed-toe shoes'],
            correctIndex: 2,
            explanation: 'Steel-toecap safety boots protect feet from falling objects, crush injuries, and sharp hazards common in warehouse environments.'
        },
        {
            q: 'Before using PPE, what must you do?',
            options: ['Put it on as quickly as possible', 'Inspect it for damage, fit it correctly, and ensure it is suitable for the task', 'Use any available PPE regardless of size or condition', 'Wait for a manager to confirm you need it'],
            correctIndex: 1,
            explanation: 'PPE must be inspected before each use. Damaged, ill-fitting, or unsuitable PPE provides no protection and may create additional risks.'
        }
    ];

    const fireSafetyQuestions = [
        {
            q: 'The fire alarm sounds. What is the correct immediate action?',
            options: ['Finish the task you are working on first', 'Investigate to check if it is a real fire before acting', 'Evacuate immediately via the nearest safe exit without delay', 'Wait for a supervisor to give instructions'],
            correctIndex: 2,
            explanation: 'On hearing the fire alarm, evacuate immediately via the nearest safe exit. Never delay to collect belongings or investigate the source.'
        },
        {
            q: 'After evacuating the building during a fire, where should you go?',
            options: ['To your car in the car park', 'To the designated assembly point', 'To a nearby café or public building', 'Back inside to retrieve your belongings'],
            correctIndex: 1,
            explanation: 'You must proceed directly to the designated fire assembly point where a roll call will be taken. Never re-enter the building until told it is safe.'
        },
        {
            q: 'When is it appropriate to use a fire extinguisher?',
            options: ['Whenever you see any fire', 'Only if the fire is small, you are trained, and your escape route is clear', 'Always — you should try to fight any fire', 'Instead of calling the fire service'],
            correctIndex: 1,
            explanation: 'Only attempt to fight a fire if it is small and contained, you have been trained to use extinguishers, and your escape route is still clear.'
        },
        {
            q: 'How should you report a fire hazard you have identified?',
            options: ['Fix it yourself and do not tell anyone', 'Report it to your supervisor or fire warden immediately', 'Write it down in a notebook for later', 'Post about it on the company notice board'],
            correctIndex: 1,
            explanation: 'Fire hazards must be reported immediately to a supervisor or fire warden so they can be assessed and resolved without delay.'
        }
    ];

    const movingVehiclesQuestions = [
        {
            q: 'Who is authorised to operate a forklift truck?',
            options: ['Any employee who holds a car driving licence', 'Only formally trained and certified forklift operators', 'Any warehouse manager or team leader', 'Any employee over the age of 18'],
            correctIndex: 1,
            explanation: 'Only formally trained and certified personnel may operate a forklift. Unauthorised operation is illegal and extremely dangerous.'
        },
        {
            q: 'When walking through the warehouse, how should you interact with an approaching forklift?',
            options: ['Walk as close to it as possible to save time', 'Assume the driver has seen you and continue', 'Make eye contact with the driver, wait until they acknowledge you, then proceed', 'Run quickly past the forklift'],
            correctIndex: 2,
            explanation: 'Forklift drivers have limited visibility. Always make eye contact with the operator to confirm they have seen you before moving near their path.'
        },
        {
            q: 'What is the safest place to walk in an area where forklifts operate?',
            options: ['Anywhere on the warehouse floor — there is enough space', 'Along marked pedestrian walkways and corridors', 'Behind the forklift where you can see it', 'On the forklift itself if you need to cross quickly'],
            correctIndex: 1,
            explanation: 'Marked pedestrian walkways keep you separated from vehicle routes. Never walk in forklift operating zones unless authorised.'
        },
        {
            q: 'You are approaching a blind corner in the warehouse. What should you do?',
            options: ['Walk quickly to get past it before any vehicle arrives', 'Slow down, look, and use mirrors if available before proceeding', 'Shout to warn any approaching vehicles', 'Avoid the area entirely'],
            correctIndex: 1,
            explanation: 'Blind corners are high-risk areas. Always slow down, use warning mirrors, and look carefully before proceeding to avoid collision with vehicles.'
        }
    ];

    const insertQAndA = async (moduleId, questions) => {
        for (let i = 0; i < questions.length; i++) {
            const q = questions[i];
            await run(`INSERT INTO questions (module_id, question_text, explanation, order_index) VALUES (?, ?, ?, ?)`,
                [moduleId, q.q, q.explanation, i]);
            const row = await get(`SELECT last_insert_rowid() as id`);
            const qId = row.id;
            for (let j = 0; j < q.options.length; j++) {
                await run(`INSERT INTO options (question_id, option_text, is_correct) VALUES (?, ?, ?)`,
                    [qId, q.options[j], j === q.correctIndex ? 1 : 0]);
            }
        }
    };

    // Module IDs are 1-5 in insertion order
    await insertQAndA(1, manualHandlingQuestions);       // Manual Handling
    await insertQAndA(2, hazardAwarenessQuestions);      // Hazard Awareness
    await insertQAndA(3, ppeQuestions);                  // PPE Awareness
    await insertQAndA(4, fireSafetyQuestions);           // Fire Safety
    await insertQAndA(5, movingVehiclesQuestions);       // Moving Vehicles & Equipment

    console.log('\n=== Database Seeding Complete ===');
    console.log('Demo Accounts:');
    console.log('  Admin:      admin@northgate.com      / Admin@2026');
    console.log('  Supervisor: sarah.s@northgate.com    / SarahSup!123');
    console.log('  Worker:     alex.k@northgate.com     / AlexK_pass1');
    console.log('  Worker:     sam.p@northgate.com      / SamP_pass2');
    console.log('  Worker:     riley.c@northgate.com    / RileyC_pass3');
    console.log('  Worker:     taylor.m@northgate.com   / TaylorM_pass4');
    console.log('  Worker:     priya.s@northgate.com    / PriyaS_pass5');
    console.log('  Worker:     chris.w@northgate.com    / ChrisW_pass6');
}

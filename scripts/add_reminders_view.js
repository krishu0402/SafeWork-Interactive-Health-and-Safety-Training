const fs = require('fs');
let html = fs.readFileSync('public/supervisor.html', 'utf8');

const view = `
            <!-- Reminders View -->
            <div class="content-area hidden" id="view-reminders">
                <h2>Training Reminders</h2>
                <div class="card mt-3">
                    <div class="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Worker</th>
                                    <th>Module</th>
                                    <th>Status</th>
                                    <th>Due Date</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody id="sup-reminders-body">
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
`;

html = html.replace('        </main>', view + '        </main>');
fs.writeFileSync('public/supervisor.html', html);
console.log('done');

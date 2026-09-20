document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const errorDiv = document.getElementById('error-message');
            
            errorDiv.classList.add('hidden');
            errorDiv.innerText = '';

            try {
                const data = await API.request('/api/auth/login', {
                    method: 'POST',
                    body: { email, password }
                });

                // Redirect based on role
                if (data.user.role === 'Worker') {
                    window.location.href = '/worker.html';
                } else if (data.user.role === 'Supervisor') {
                    window.location.href = '/supervisor.html';
                } else if (data.user.role === 'Administrator') {
                    window.location.href = '/admin.html';
                } else {
                    window.location.href = '/index.html';
                }
            } catch (error) {
                errorDiv.innerText = error.message;
                errorDiv.classList.remove('hidden');
            }
        });
    }
});

async function logout() {
    try {
        await API.request('/api/auth/logout', { method: 'POST' });
        window.location.href = '/login.html';
    } catch (e) {
        console.error('Logout failed', e);
        window.location.href = '/login.html';
    }
}

const API = {
    async request(url, options = {}) {
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json'
            }
        };

        if (options.body) {
            options.body = JSON.stringify(options.body);
        }

        const finalOptions = { ...defaultOptions, ...options };
        
        try {
            const response = await fetch(url, finalOptions);
            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                if (response.status === 401 && !url.includes('/api/auth/login')) {
                    // Redirect to login if unauthorized
                    window.location.href = '/login.html';
                }
                throw new Error(data.error || 'API Request Failed');
            }
            return data;
        } catch (error) {
            throw error;
        }
    }
};

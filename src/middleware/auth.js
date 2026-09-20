const requireAuth = (req, res, next) => {
    if (req.session && req.session.userId) {
        return next();
    }
    return res.status(401).json({ error: 'Unauthorized: Please log in.' });
};

const requireRole = (roles) => {
    return (req, res, next) => {
        if (!req.session || !req.session.roleId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        
        // Roles: 1 = Worker, 2 = Supervisor, 3 = Administrator
        if (roles.includes(req.session.roleId)) {
            return next();
        }
        
        return res.status(403).json({ error: 'Forbidden: Insufficient permissions.' });
    };
};

module.exports = {
    requireAuth,
    requireRole
};

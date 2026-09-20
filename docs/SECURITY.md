# SafeWork Security Notes

## Implemented in the prototype

- Passwords are stored as bcrypt hashes rather than plain text.
- Login uses server-side sessions and an HTTP-only cookie.
- Protected routes require an authenticated session.
- Role middleware separates worker, supervisor and administrator permissions.
- Helmet is enabled for security-related HTTP headers.
- SQL statements use parameter values rather than string concatenation for user input.
- Login, setup and account-management activity is recorded in the audit log.
- Private setup credentials are written to a local file excluded by `.gitignore`.

## Before production

- Use HTTPS and set production cookie security settings.
- Replace the default in-memory session store with a persistent, protected session store.
- Add CSRF protection, rate limiting, password reset, MFA and account lockout controls.
- Add server-side validation for every user and module field.
- Use a managed database with encrypted backups and least-privilege access.
- Add structured logs, alerting, dependency scanning and regular security testing.
- Review safety content with the client's health and safety lead before operational use.

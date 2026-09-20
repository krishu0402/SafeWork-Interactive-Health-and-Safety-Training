# SafeWork Test Checklist

| Test | Expected result |
|---|---|
| Open `/` | Promotional website loads with working sign-in links |
| Invalid login | Clear error message appears and user remains on login page |
| Worker login | Worker dashboard opens |
| Supervisor login | Supervisor dashboard opens |
| Administrator login | Administrator dashboard opens |
| Worker start module | Module questions load and can be answered |
| Submit passed quiz | Score is shown, assignment is marked passed and certificate is available |
| Supervisor assign training | Assignment is stored and appears in reporting views |
| Supervisor create worker | New worker is stored with a hashed password |
| Administrator create module | New module appears in the module catalogue |
| Export report | CSV file is downloaded |
| Logout | Session is destroyed and user is returned to login |
| Protected page without login | User is redirected to login by the API/client guard |

Run the syntax check with:

```powershell
npm test
```

# Auth Module Agent Rules

## Dependency Rules
1. **Critical**: Auth depends **ONLY** on `Common`.
2. **Forbidden**: Do NOT import `Memories`, `Social`, `Postcards`, or other feature modules.
3. **Reasoning**: Auth is a core utility/domain. Feature modules depend on Auth (for guards), not vice-versa. Circular dependencies must be avoided.

## Code Structure
- Logic goes in `AuthService`.
- Controllers handle HTTP requests.
- Strategies (`LocalStrategy`, `JwtStrategy`) handle Passport logic.

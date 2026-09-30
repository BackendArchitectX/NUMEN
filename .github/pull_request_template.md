## Summary

Describe the user or engineering outcome of this change.

## Change type

- [ ] Feature
- [ ] Fix
- [ ] Refactor
- [ ] Security / reliability
- [ ] Documentation

## Verification

- [ ] `mvn -B verify` passes in `backend/`
- [ ] `npm run typecheck && npm run build` passes in `frontend/`
- [ ] `./start.sh --no-browser` or `.\start.ps1 -NoBrowser` starts the complete stack
- [ ] No secrets, generated artifacts, or local `.env` files are committed
- [ ] API/schema changes include migration and documentation updates where required

## Operational impact

Note any new environment variables, database migrations, ports, external calls, or rollback considerations.

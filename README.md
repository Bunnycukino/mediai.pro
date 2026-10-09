# MediAI

Source for mediai.pro, separated from the SusStyle fashion store on October 9, 2026.

The default branch codex/mediai-recovery contains the restored medical frontend: landing page, sign-in, registration, chat, conversation history, profile, and administration. The imported main branch preserves the earlier shop snapshot; it is not the deployment branch for MediAI.

## Frontend

Run commands in frontend. Install with npm ci --legacy-peer-deps and build with npm run build. The app uses CRACO and the @ source alias, so use the package build script rather than invoking react-scripts directly.

Set REACT_APP_BACKEND_URL to the deployed backend base URL, without the /api suffix. This value is public in the compiled frontend. Never put API keys into REACT_APP_ variables.

Vercel project: mediai. Root directory: frontend. Preset: Create React App. Output: build. Use supported Node.js 24 for new deployments.

## Backend

The existing API runs at https://susstyle-backend.onrender.com. Backend source is in backend, with configuration read from environment variables. Production secrets remain in the hosting provider.

Recovery restored the frontend from commit d98eb596101f04a0400e778bd749bd5e7f4c7293 and fixed the date-fns/react-day-picker dependency conflict. The Git history was retained during the import.
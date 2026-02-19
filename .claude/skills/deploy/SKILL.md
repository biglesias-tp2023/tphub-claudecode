---
name: deploy
description: Build and deploy TPHub to Vercel production
allowed-tools:
  - Bash(npm run build)
  - Bash(vercel --prod --yes)
  - Bash(vercel --version)
---

# Deploy to Vercel Production

Deploy TPHub to Vercel production environment.

## Steps

1. **Verify Vercel CLI is installed**
   ```bash
   vercel --version
   ```
   If not installed, tell the user to run `npm i -g vercel` and authenticate with `vercel login`.

2. **Build the project** to catch errors before deploying:
   ```bash
   npm run build
   ```
   If the build fails, report the errors and stop. Do NOT deploy a broken build.

3. **Deploy to production**:
   ```bash
   vercel --prod --yes
   ```

4. **Report the result**: Show the production URL and confirm the deploy succeeded.

## Important

- Never deploy if `npm run build` fails
- The production URL is `tphub.vercel.app`
- If there are TypeScript errors, fix them before deploying (ask the user)
- If there are uncommitted changes, warn the user but proceed if they confirm

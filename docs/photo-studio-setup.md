# Banggai Wonderland Photo Studio — setup

This page is a private, noindex upload utility. It converts selected images to WebP in the browser and sends the result to the existing Google Apps Script backend. The GitHub OAuth access token and repository write token remain server-side.

## Important deployment boundary

The Astro page is a static file in this repository. The OAuth callback and upload authorization run in Google Apps Script. Updating google-apps-script/Code.gs in GitHub does not update the deployed Apps Script automatically. Complete the configuration below before using the page.

## 1. Create a GitHub OAuth App

In GitHub, open Settings → Developer settings → OAuth Apps → New OAuth App.

- Application name: Banggai Wonderland Photo Studio
- Homepage URL: https://banggaiwonderland.my.id/photo-studio/
- Authorization callback URL: the exact Web App URL from Deploy → Manage deployments in Google Apps Script (the URL ending in /exec).

Create the app and copy its Client ID and Client Secret. Never put the Client Secret in Astro, HTML, JavaScript, GitHub commits, or public environment variables.

## 2. Configure Google Apps Script Script Properties

In the Apps Script project corresponding to google-apps-script/Code.gs, open Project Settings → Script Properties and add:

- GITHUB_OAUTH_CLIENT_ID: OAuth App Client ID
- GITHUB_OAUTH_CLIENT_SECRET: OAuth App Client Secret
- GITHUB_OAUTH_ALLOWED_USER: the single allowed GitHub login, intended to be barrack3030-wq
- PHOTO_STUDIO_URL: https://banggaiwonderland.my.id/photo-studio/

Retain the existing GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO, and GITHUB_BRANCH Script Properties used by the existing CMS. Do not expose their values.

## 3. Deploy the backend update

Copy the updated google-apps-script/Code.gs from this branch into the existing Apps Script project, save it, then Deploy → Manage deployments → Edit the existing Web App deployment and publish a new version. Keep the same /exec URL so existing CMS integrations continue to use it. The Web App must execute as the script owner; access should be restricted as required by the existing integration, while GitHub OAuth is the gate for Photo Studio upload actions.

Do not publish the OAuth Client Secret in this repository.

## 4. Test before routine use

1. Open https://banggaiwonderland.my.id/photo-studio/.
2. Select Login dengan GitHub and confirm the browser goes to GitHub's authorization screen.
3. Confirm the allowed account returns to Photo Studio and an unapproved account is rejected.
4. Upload one non-sensitive test photo. Verify the resulting file under public/images/blog/ is WebP and the URL is returned.
5. Confirm the normal CMS still passes its existing health check and upload flow.

## Security and operational notes

- GitHub OAuth tokens are exchanged and checked on the Apps Script server. The GitHub access token is not returned to the browser.
- The page holds only a short-lived, random session identifier in session storage; server-side session lifetime is 30 minutes.
- The allowlist is a single configured GitHub username. Do not broaden it without a deliberate access review.
- The page uses noindex,nofollow,noarchive; this is not authentication by itself.
- Uploads use the repository and branch configured for the existing CMS, which currently may commit directly to the configured branch. Confirm that setting before uploading production photos.
- Image compression is performed on the user's device: longest edge up to 2000 px, WebP quality 82%.
- This PR does not merge itself and does not change Vercel or Netlify settings.
# Banggai Wonderland Photo Studio — Cloudflare Worker

Photo Studio converts selected images to WebP in the browser and uploads them to `public/images/blog/` through a private Cloudflare Worker. There is no access code, no GitHub login, and no Google Apps Script dependency for Photo Studio. The GitHub write token is stored only as a Cloudflare Worker secret.

## Architecture and access control

- The public Astro page contains only the Worker endpoint URL, which is not a secret.
- Cloudflare Access protects the Worker hostname and allows only the owner's identity (prefer Google login for the owner's account; do not enable public access).
- The Worker independently validates the `Cf-Access-Jwt-Assertion` signature, issuer, expiry and Access AUD before accepting an upload.
- The Worker stores the GitHub token as a secret and only writes WebP files to `public/images/blog/`.
- This does not use GitHub OAuth or an access code in the page, and does not modify Vercel or Netlify.

## One-time Cloudflare setup

1. Create a Cloudflare Worker named `banggai-wonderland-photo-studio` and deploy the source in `workers/photo-studio-api/src/index.js`. Use the included `wrangler.toml` as a starting point.
2. Add a custom hostname under a domain managed by Cloudflare (recommended: a dedicated API subdomain). Keep the site itself and its existing hosting/deployment configuration unchanged.
3. Create a Cloudflare Access self-hosted application for the Worker hostname. Add an **Allow** policy limited to the owner's identity/email only. Prefer an identity-provider sign-in; do not use an Access PIN or public policy.
4. Copy the Access team issuer URL and application's AUD tag into Worker variables:
   - `CF_ACCESS_TEAM_DOMAIN`: for example, `https://your-team.cloudflareaccess.com` (no trailing slash).
   - `CF_ACCESS_AUD`: the Access application's AUD tag.
   - `GITHUB_OWNER`: `barrack3030-wq`
   - `GITHUB_REPO`: `A-new-Wonderland`
   - `GITHUB_BRANCH`: `main`
5. Add `GITHUB_TOKEN` as a **Worker secret**, not a plain variable. Use a fine-grained GitHub token scoped to this repository with Contents: Read and write only. Never add it to the Astro page, Wrangler file, or Git repository.
6. Set the Worker hostname in `src/pages/photo-studio.astro` by replacing `https://REPLACE-WITH-YOUR-CLOUDFLARE-WORKER-HOST`. The endpoint hostname is public and is not a credential.
7. Deploy the Worker and publish the website through the repository's existing workflow. Do not configure or change Vercel or Netlify.

## Test checklist

1. Without signing in, POST requests to the Worker must be rejected.
2. A non-allowlisted identity must be blocked by Cloudflare Access.
3. Sign in with the owner's account using the **Masuk sebagai pemilik** link; return to Photo Studio.
4. Upload a non-sensitive test photo. Verify it appears in `public/images/blog/` and the response returns `/images/blog/<filename>.webp`.
5. Try a duplicate filename and confirm the Worker refuses to overwrite the existing image.
6. Confirm no GitHub token, access code, or reusable session secret appears in built frontend assets.

## Image processing

- JPG, PNG, and WebP accepted as input.
- Compression happens in the browser: longest edge 2000 px, WebP quality 82%.
- Maximum source size: 15 MB; maximum uploaded WebP: 8 MB.
- Photo Studio page remains `noindex,nofollow,noarchive`. This is not an access-control mechanism by itself.

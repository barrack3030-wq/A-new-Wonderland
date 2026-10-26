# Banggai Wonderland Photo Studio — setup

Photo Studio is a private, noindex upload utility. It converts selected images to WebP in the browser and sends them to the existing Google Apps Script backend. No GitHub login is needed; a private access code is validated server-side. The repository write token remains only in Apps Script Script Properties.

## 1. Configure the backend access code

In the Google Apps Script project corresponding to `google-apps-script/Code.gs`, open Project Settings → Script Properties and add:

- `PHOTO_STUDIO_ACCESS_CODE`: a unique random secret of at least 20 characters. Prefer 32+ random characters. Do not reuse a password and do not commit it to GitHub or put it in the Astro page.
- Keep the existing `GITHUB_TOKEN`, `GITHUB_OWNER`, `GITHUB_REPO`, and `GITHUB_BRANCH` Script Properties used by the CMS. Never expose their values.

The code is sent over HTTPS only when the owner unlocks Photo Studio. Apps Script validates it on the server and returns a random temporary session token. The access code is not stored in browser storage. The temporary session lasts 30 minutes and is held in sessionStorage.

## 2. Deploy the Apps Script backend update

Copy the updated `google-apps-script/Code.gs` from this branch into the existing Apps Script project, save it, then Deploy → Manage deployments → Edit the existing Web App deployment and publish a new version. Keep the same `/exec` URL so the existing CMS integration continues to work. Preserve the existing execution/access configuration required by the CMS.

## 3. Test before routine use

1. Open https://banggaiwonderland.my.id/photo-studio/.
2. Enter the private access code and confirm that the studio opens.
3. Try an incorrect code and confirm that the server rejects it.
4. Upload one non-sensitive test photo. Verify the resulting WebP file under `public/images/blog/` and check that the image URL is returned.
5. Confirm the normal CMS health check and upload flow still work.

## Security and operational notes

- This removes GitHub OAuth; it does not remove backend authentication.
- The access code must remain secret and should be long and randomly generated. Anyone who learns it can upload files. Rotate it by changing `PHOTO_STUDIO_ACCESS_CODE` in Script Properties.
- Do not store the access code in frontend JavaScript, HTML, repository files, or public environment variables.
- The page uses `noindex,nofollow,noarchive`; this is not authentication by itself.
- Uploads use the repository and branch configured for the existing CMS. Confirm that configuration before uploading production photos.
- Image compression runs on the user's device: longest edge up to 2000 px, WebP quality 82%.
- This change does not alter Vercel or Netlify settings.

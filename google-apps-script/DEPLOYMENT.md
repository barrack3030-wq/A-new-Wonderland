# Banggai Wonderland CMS — Apps Script deployment

The repository copy of `Code.gs` is now hardened for JSON responses (`7.1-resilient-json-api`).

After changing `Code.gs`, update the Google Apps Script Web App deployment:

1. Deploy → Manage deployments.
2. Edit the Web App deployment.
3. Execute as: Me.
4. Who has access: Anyone.
5. Select the newest version and Deploy.
6. The CMS must use the URL ending in `/exec`, never `/dev`.

Open the `/exec` URL directly. It should return JSON containing:
`"service":"Banggai Wonderland CMS"`, `"version":"7.1-resilient-json-api"`, and `"status":"online"`.

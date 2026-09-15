# Banggai Wonderland CMS — Apps Script deployment

`Code.gs` now supports the existing Bulk workflow plus the separate Manual Article workflow for Indonesian + English + Chinese + French + German.

After changing `Code.gs`, update the Google Apps Script Web App deployment:

1. Deploy → Manage deployments.
2. Edit the Web App deployment.
3. Execute as: Me.
4. Who has access: Anyone.
5. Select the newest version and Deploy.
6. The CMS must use the URL ending in `/exec`, never `/dev`.

Open the `/exec` URL directly. It should return JSON containing:
`"service":"Banggai Wonderland CMS"`, `"version":"8.0-manual-multilang"`, and `"status":"online"`.

Manual CMS page:
`/cms/manual/`

Manual languages:
- Indonesian — source article
- English — Translate English
- Chinese — Translate Chinese
- French — Translate French
- German — Translate German

The existing Bulk workflow remains separate and continues to use Indonesian + English + Spanish + French + Chinese.

# Banggai Wonderland AI CMS Backend

This folder contains the Google Apps Script backend used by `/cms/`.

## 1. Create the Apps Script project

Open Google Apps Script and create a new project. Copy `Code.gs` into the project.

## 2. Add Script Properties

In Apps Script: Project Settings → Script properties.

Add:

- `OPENAI_API_KEY` = your OpenAI API key
- `GITHUB_TOKEN` = a GitHub fine-grained token with **Contents: Read and write** access to `barrack3030-wq/A-new-Wonderland`
- `CMS_ACCESS_KEY` = create your own long random password for the CMS

Do not put any of these values into the GitHub repository or the frontend.

## 3. Deploy

Deploy → New deployment → Web app.

Execute as: **Me**

Who has access: **Anyone**

Copy the Web app URL.

## 4. Connect the CMS page

Open `src/pages/cms/index.astro` and replace:

`PASTE_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE`

with the Web app URL, then commit the file.

The private CMS will then be available at:

`/cms/`

It is intentionally not linked from the public navigation and has `noindex,nofollow`.

## 5. OpenAI model

The backend uses `gpt-5.6-luna`, a current cost-sensitive OpenAI model. Change `CONFIG.model` in `Code.gs` only if you intentionally want another API model.

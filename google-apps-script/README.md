# Banggai Wonderland AI CMS Backend

This folder contains the Google Apps Script backend used by `/cms/`.

## 1. Create the Apps Script project

Open Google Apps Script and create a new project. Copy `Code.gs` into the project.

## 2. Add Script Properties

In Apps Script: Project Settings → Script properties.

Add:

- `OPENAI_API_KEY` = your OpenAI API key (required for web research)
- `DEEPSEEK_API_KEY` = your DeepSeek API key (required when DeepSeek is selected as writer)
- `GITHUB_TOKEN` = a GitHub fine-grained token with **Contents: Read and write** access to `barrack3030-wq/A-new-Wonderland`
- `CMS_ACCESS_KEY` = create your own long random password for the CMS

Do not put any of these values into the GitHub repository or the frontend.

## 3. AI writer options

The CMS now supports two writing providers:

- **OpenAI · GPT-5.6 Luna** for article writing
- **DeepSeek · V4 Flash** for article writing

Web research is performed by OpenAI because the research step uses OpenAI's built-in web search tool. The selected provider is then used to write the five language versions.

DeepSeek uses the official Responses API endpoint at `https://api.deepseek.com/responses`.

## 4. Deploy

Deploy → New deployment → Web app.

Execute as: **Me**

Who has access: **Anyone**

After changing `Code.gs`, use Deploy → Manage deployments → Edit → **New version** → Deploy so the live Web App uses the newest code.

Copy the Web app URL.

## 5. Connect the CMS page

Open `src/pages/cms/index.astro` and make sure the `ENDPOINT` constant contains your Web App URL.

The private CMS will then be available at:

`/cms/`

It is intentionally not linked from the public navigation and has `noindex,nofollow`.

## 6. Current AI configuration

- OpenAI model: `gpt-5.6-luna`
- DeepSeek model: `deepseek-v4-flash`
- Research context: medium
- Article target: approximately 1,200–1,800 words
- Languages: Indonesian, English, Spanish, French, Chinese
- Language generation: two requests per batch to reduce TPM spikes
- Automatic retry for HTTP 429 rate-limit responses

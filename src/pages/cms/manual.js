export const manualLanguages=['en','zh','fr','de'];
export function buildManualRequest(language, source){return {action:'translateManual',language,source};}
// trigger manual multilingual CMS workflow

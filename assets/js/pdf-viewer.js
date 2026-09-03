/**
 * Selects the requested current PDF from Supabase when configured.
 * The local PDF remains a reliable fallback for offline testing.
 */
const config = window.SUPABASE_CONFIG ?? {};
const isConfigured =
  config.url &&
  config.publishableKey &&
  !config.publishableKey.includes("HIER_");

const pdfFile = document.body.dataset.pdfFile || "geschichte.pdf";

if (isConfigured) {
  const pdfUrl = `${config.url}/storage/v1/object/public/story/current/${pdfFile}`;

  document.querySelector("#pdf-frame").src = pdfUrl;
  document.querySelector("#viewer-download").href = pdfUrl;
  document.querySelector("#viewer-fallback-link").href = pdfUrl;
}

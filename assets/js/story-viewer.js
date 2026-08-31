/**
 * Renders the current HTML story inside the site's own viewer.
 *
 * Supabase may serve uploaded HTML as text/plain for security reasons. Fetching
 * the trusted release as text and assigning it to iframe.srcdoc preserves the
 * intended design without depending on the storage response's MIME type.
 */
const config = window.SUPABASE_CONFIG ?? {};
const frame = document.querySelector("#story-frame");
const statusNode = document.querySelector("#story-status");
const releaseNode = document.querySelector("#story-release");
const errorNode = document.querySelector("#story-error");
const zoomOutButton = document.querySelector("#zoom-out");
const zoomResetButton = document.querySelector("#zoom-reset");
const zoomInButton = document.querySelector("#zoom-in");
const localStoryUrl = "story/current/fahrt-zum-kunden.html";
const minimumZoom = 0.7;
const maximumZoom = 1.6;
const zoomStep = 0.1;

let zoomLevel = 1;

function hasSupabaseConfig() {
  return Boolean(
    config.url &&
      config.publishableKey &&
      !config.publishableKey.includes("HIER_"),
  );
}

async function fetchStory(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.text();
}

function applyZoom() {
  const storyDocument = frame.contentDocument;
  if (!storyDocument) return;

  storyDocument.documentElement.style.zoom = String(zoomLevel);
  zoomResetButton.textContent = `${Math.round(zoomLevel * 100)} %`;
  zoomOutButton.disabled = zoomLevel <= minimumZoom;
  zoomInButton.disabled = zoomLevel >= maximumZoom;
}

function changeZoom(change) {
  zoomLevel = Math.min(
    maximumZoom,
    Math.max(minimumZoom, Number((zoomLevel + change).toFixed(1))),
  );
  applyZoom();
}

async function loadReleaseInfo() {
  if (!hasSupabaseConfig()) return;

  try {
    const endpoint =
      `${config.url}/rest/v1/story_release` +
      "?id=eq.current&select=version,display_date";
    const response = await fetch(endpoint, {
      headers: { apikey: config.publishableKey },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const [release] = await response.json();
    if (release) {
      releaseNode.textContent =
        `Version ${release.version} · ${release.display_date}`;
    }
  } catch (error) {
    console.warn("Release metadata could not be loaded", error);
  }
}

async function loadStory() {
  const remoteStoryUrl = hasSupabaseConfig()
    ? `${config.url}/storage/v1/object/public/story/current/fahrt-zum-kunden.html`
    : localStoryUrl;

  try {
    frame.srcdoc = await fetchStory(remoteStoryUrl);
    statusNode.textContent = "Aktuelle HTML-Lesefassung";
  } catch (remoteError) {
    try {
      frame.srcdoc = await fetchStory(localStoryUrl);
      statusNode.textContent = "Lokale HTML-Lesefassung";
    } catch (localError) {
      statusNode.textContent = "Laden fehlgeschlagen";
      errorNode.hidden = false;
      console.error("Story loading failed", remoteError, localError);
    }
  }
}

loadReleaseInfo();
loadStory();

frame.addEventListener("load", applyZoom);
zoomOutButton.addEventListener("click", () => changeZoom(-zoomStep));
zoomInButton.addEventListener("click", () => changeZoom(zoomStep));
zoomResetButton.addEventListener("click", () => {
  zoomLevel = 1;
  applyZoom();
});

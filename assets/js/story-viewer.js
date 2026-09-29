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
const chapterSelect = document.querySelector("#chapter-select");
const currentSectionNode = document.querySelector("#current-section");
const zoomOutButton = document.querySelector("#zoom-out");
const zoomResetButton = document.querySelector("#zoom-reset");
const zoomInButton = document.querySelector("#zoom-in");
const localStoryUrl = "story/current/fahrt-zum-kunden.html";
const minimumZoom = 0.7;
const maximumZoom = 1.6;
const zoomStep = 0.1;

let zoomLevel = 1;
let storyChapters = [];

function hasSupabaseConfig() {
  return Boolean(
    config.url &&
      config.publishableKey &&
      !config.publishableKey.includes("HIER_"),
  );
}

async function fetchStory(url) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 15000);
  const separator = url.includes("?") ? "&" : "?";

  let response;
  try {
    response = await fetch(`${url}${separator}viewer=${Date.now()}`, {
      cache: "no-store",
      signal: controller.signal,
    });
  } finally {
    window.clearTimeout(timeout);
  }
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
  updateCurrentSection();
}

function changeZoom(change) {
  zoomLevel = Math.min(
    maximumZoom,
    Math.max(minimumZoom, Number((zoomLevel + change).toFixed(1))),
  );
  applyZoom();
}

function updateCurrentSection() {
  const storyWindow = frame.contentWindow;
  if (!storyWindow || storyChapters.length === 0) return;

  const readingLine = storyWindow.scrollY + 140;
  let currentIndex = -1;

  storyChapters.forEach((chapter, index) => {
    const chapterTop =
      chapter.heading.getBoundingClientRect().top + storyWindow.scrollY;
    if (chapterTop <= readingLine) currentIndex = index;
  });

  if (currentIndex < 0) {
    chapterSelect.value = "__top";
    currentSectionNode.textContent = "Anfang";
    return;
  }

  const current = storyChapters[currentIndex];
  chapterSelect.value = current.id;
  currentSectionNode.textContent =
    `Abschnitt ${currentIndex + 1} von ${storyChapters.length}: ${current.title}`;
}

function buildChapterNavigation() {
  const storyDocument = frame.contentDocument;
  const storyWindow = frame.contentWindow;
  if (!storyDocument || !storyWindow) return;

  storyChapters = Array.from(storyDocument.querySelectorAll("h2"))
    .map((heading, index) => {
      const existingId = heading.id || heading.closest("[id]")?.id;
      const id = existingId || `leseabschnitt-${index + 1}`;
      if (!existingId) heading.id = id;
      return { id, title: heading.textContent.trim(), heading };
    })
    .filter((chapter) => chapter.title);

  chapterSelect.replaceChildren();
  chapterSelect.add(new Option("Anfang der Geschichte", "__top"));
  storyChapters.forEach((chapter) => {
    chapterSelect.add(new Option(chapter.title, chapter.id));
  });
  chapterSelect.disabled = storyChapters.length === 0;

  storyWindow.addEventListener("scroll", updateCurrentSection, {
    passive: true,
  });
  updateCurrentSection();
}

function enableInternalStoryLinks() {
  const storyDocument = frame.contentDocument;
  if (!storyDocument) return;

  storyDocument.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", (event) => {
      const fragment = link.getAttribute("href").slice(1);
      if (!fragment) return;

      const targetId = decodeURIComponent(fragment);
      const target = storyDocument.getElementById(targetId);
      if (!target) return;

      event.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
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

frame.addEventListener("load", () => {
  buildChapterNavigation();
  enableInternalStoryLinks();
  applyZoom();
});
chapterSelect.addEventListener("change", () => {
  const storyDocument = frame.contentDocument;
  const storyWindow = frame.contentWindow;
  if (!storyDocument || !storyWindow) return;

  if (chapterSelect.value === "__top") {
    storyWindow.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }

  storyDocument
    .getElementById(chapterSelect.value)
    ?.scrollIntoView({ behavior: "smooth", block: "start" });
});
zoomOutButton.addEventListener("click", () => changeZoom(-zoomStep));
zoomInButton.addEventListener("click", () => changeZoom(zoomStep));
zoomResetButton.addEventListener("click", () => {
  zoomLevel = 1;
  applyZoom();
});

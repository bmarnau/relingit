/**
 * Loads the current workshop handout into the protected site viewer.
 * Fetching the file as text avoids Supabase Storage's download-oriented MIME
 * handling while the local copy remains available as an offline fallback.
 */
const config = window.SUPABASE_CONFIG ?? {};
const frame = document.querySelector("#handout-frame");
const statusNode = document.querySelector("#handout-status");
const errorNode = document.querySelector("#handout-error");
const chapterSelect = document.querySelector("#chapter-select");
const currentSectionNode = document.querySelector("#current-section");
const zoomOutButton = document.querySelector("#zoom-out");
const zoomResetButton = document.querySelector("#zoom-reset");
const zoomInButton = document.querySelector("#zoom-in");
const localUrl = "story/current/workshop-handout.html";
let zoomLevel = 1;
let sections = [];

function isConfigured() {
  return Boolean(config.url && config.publishableKey && !config.publishableKey.includes("HIER_"));
}

async function fetchMarkup(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.text();
}

function applyZoom() {
  if (!frame.contentDocument) return;
  frame.contentDocument.documentElement.style.zoom = String(zoomLevel);
  zoomResetButton.textContent = `${Math.round(zoomLevel * 100)} %`;
  zoomOutButton.disabled = zoomLevel <= 0.7;
  zoomInButton.disabled = zoomLevel >= 1.6;
}

function changeZoom(change) {
  zoomLevel = Math.min(1.6, Math.max(0.7, Number((zoomLevel + change).toFixed(1))));
  applyZoom();
}

function updateCurrentSection() {
  const handoutWindow = frame.contentWindow;
  if (!handoutWindow || sections.length === 0) return;
  const readingLine = handoutWindow.scrollY + 140;
  let current = sections[0];
  sections.forEach((section) => {
    if (section.heading.getBoundingClientRect().top + handoutWindow.scrollY <= readingLine) current = section;
  });
  chapterSelect.value = current.id;
  currentSectionNode.textContent = current.title;
}

function buildNavigation() {
  const document = frame.contentDocument;
  const handoutWindow = frame.contentWindow;
  if (!document || !handoutWindow) return;
  sections = Array.from(document.querySelectorAll("h1, h2")).map((heading, index) => {
    const id = heading.id || `handout-abschnitt-${index + 1}`;
    heading.id = id;
    return { id, title: heading.textContent.trim(), heading };
  }).filter((section) => section.title);
  chapterSelect.replaceChildren(...sections.map((section) => new Option(section.title, section.id)));
  chapterSelect.disabled = sections.length === 0;
  handoutWindow.addEventListener("scroll", updateCurrentSection, { passive: true });
  updateCurrentSection();
}

async function loadHandout() {
  const remoteUrl = isConfigured()
    ? `${config.url}/storage/v1/object/public/story/current/workshop-handout.html`
    : localUrl;
  try {
    frame.srcdoc = await fetchMarkup(remoteUrl);
    statusNode.textContent = "Aktuelles Workshop-Handout";
  } catch (remoteError) {
    try {
      frame.srcdoc = await fetchMarkup(localUrl);
      statusNode.textContent = "Lokales Workshop-Handout";
    } catch (localError) {
      statusNode.textContent = "Laden fehlgeschlagen";
      errorNode.hidden = false;
      console.error("Handout loading failed", remoteError, localError);
    }
  }
}

frame.addEventListener("load", () => { buildNavigation(); applyZoom(); });
chapterSelect.addEventListener("change", () => frame.contentDocument?.getElementById(chapterSelect.value)?.scrollIntoView({ behavior: "smooth" }));
zoomOutButton.addEventListener("click", () => changeZoom(-0.1));
zoomInButton.addEventListener("click", () => changeZoom(0.1));
zoomResetButton.addEventListener("click", () => { zoomLevel = 1; applyZoom(); });
loadHandout();

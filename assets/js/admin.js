/**
 * Protected release form for the single site administrator.
 *
 * The token lives only in sessionStorage and disappears when the tab closes.
 * Supabase RLS remains the authoritative permission check.
 */
const config = window.SUPABASE_CONFIG ?? {};
const loginPanel = document.querySelector("#login-panel");
const publishPanel = document.querySelector("#publish-panel");
const statusNode = document.querySelector("#admin-status");
const tokenStorageKey = "reling_admin_token";

let accessToken = sessionStorage.getItem(tokenStorageKey) || "";

function isConfigured() {
  return Boolean(
    config.url &&
      config.publishableKey &&
      !config.publishableKey.includes("HIER_"),
  );
}

function setLoggedIn(isLoggedIn) {
  loginPanel.hidden = isLoggedIn;
  publishPanel.hidden = !isLoggedIn;
}

async function signIn(email, password) {
  const response = await fetch(
    `${config.url}/auth/v1/token?grant_type=password`,
    {
      method: "POST",
      headers: {
        apikey: config.publishableKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    },
  );
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error_description || "Anmeldung fehlgeschlagen");
  }

  return data.access_token;
}

async function uploadStoryFile(file, name, contentType) {
  const response = await fetch(
    `${config.url}/storage/v1/object/story/current/${name}`,
    {
      method: "POST",
      headers: {
        apikey: config.publishableKey,
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": contentType,
        "x-upsert": "true",
      },
      body: file,
    },
  );

  if (!response.ok) {
    throw new Error(`${name}: HTTP ${response.status}`);
  }
}

async function updateReleaseMetadata(form) {
  const payload = {
    version: form.querySelector("#version").value.trim(),
    display_date: form.querySelector("#display-date").value.trim(),
    page_count: Number(form.querySelector("#page-count").value),
    published_at: new Date().toISOString(),
  };
  const response = await fetch(
    `${config.url}/rest/v1/story_release?id=eq.current`,
    {
      method: "PATCH",
      headers: {
        apikey: config.publishableKey,
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify(payload),
    },
  );

  if (!response.ok) {
    throw new Error(`Metadaten: HTTP ${response.status}`);
  }
}

if (!isConfigured()) {
  statusNode.textContent =
    "Supabase ist noch nicht in assets/js/supabase-config.js eingetragen.";
}
setLoggedIn(Boolean(accessToken));

document.querySelector("#login-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!isConfigured()) return;

  statusNode.textContent = "Anmeldung wird geprüft …";

  try {
    accessToken = await signIn(
      document.querySelector("#admin-email").value,
      document.querySelector("#admin-password").value,
    );
    sessionStorage.setItem(tokenStorageKey, accessToken);
    setLoggedIn(true);
    statusNode.textContent = "Angemeldet.";
  } catch (error) {
    statusNode.textContent =
      "Anmeldung fehlgeschlagen. E-Mail und Passwort prüfen.";
    console.error(error);
  }
});

document.querySelector("#publish-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity()) return;

  const submitButton = form.querySelector("button[type='submit']");
  submitButton.disabled = true;
  statusNode.textContent = "Dateien werden hochgeladen …";

  try {
    await uploadStoryFile(
      form.querySelector("#story-html").files[0],
      "fahrt-zum-kunden.html",
      "text/html; charset=utf-8",
    );
    await uploadStoryFile(
      form.querySelector("#story-pdf").files[0],
      "geschichte.pdf",
      "application/pdf",
    );

    // Metadata is updated last, so readers only see a fully uploaded release.
    await updateReleaseMetadata(form);
    form.reset();
    statusNode.textContent = "Die neue Version ist veröffentlicht.";
  } catch (error) {
    statusNode.textContent = `Veröffentlichung fehlgeschlagen (${error.message}). Die bisherige Version bleibt angezeigt.`;
    console.error(error);
  } finally {
    submitButton.disabled = false;
  }
});

document.querySelector("#logout").addEventListener("click", () => {
  accessToken = "";
  sessionStorage.removeItem(tokenStorageKey);
  setLoggedIn(false);
  statusNode.textContent = "Abgemeldet.";
});

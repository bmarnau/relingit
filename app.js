const fallbackRelease = { version: "1.10", date: "29. August 2026", page_count: 46 };
let release = fallbackRelease;

function showRelease(current) {
  document.querySelectorAll("[data-version]").forEach((node) => { node.textContent = current.version; });
  document.querySelectorAll("[data-date]").forEach((node) => { node.textContent = current.date; });
  const meta = document.querySelector(".meta");
  if (meta) meta.firstChild.textContent = `${current.page_count} Seiten · Bernd Marnau · aktualisiert am `;
}

async function loadRelease() {
  const config = window.SUPABASE_CONFIG ?? {};
  if (!config.url || !config.publishableKey || config.publishableKey.includes("HIER_")) {
    showRelease(release);
    return;
  }
  try {
    const response = await fetch(`${config.url}/rest/v1/story_release?id=eq.current&select=version,display_date,page_count`, { headers: { apikey: config.publishableKey } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const [current] = await response.json();
    if (current) release = { version: current.version, date: current.display_date, page_count: current.page_count };
    const base = `${config.url}/storage/v1/object/public/story/current`;
    document.querySelector("#read-link").href = `${base}/fahrt-zum-kunden.html`;
    document.querySelector("#pdf-link").href = `${base}/geschichte.pdf`;
  } catch (error) {
    console.warn("Aktuelle Version konnte nicht geladen werden; lokale Fassung wird verwendet.", error);
  }
  showRelease(release);
}

loadRelease();

const form = document.querySelector("#feedback-form");
const status = document.querySelector("#form-status");
form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!form.reportValidity()) return;
  if (document.querySelector("#website").value) return;
  const config = window.SUPABASE_CONFIG ?? {};
  const button = form.querySelector("button[type='submit']");
  const payload = { category: document.querySelector("#kind").value, message: document.querySelector("#message").value.trim(), story_version: release.version };
  if (!config.url || !config.publishableKey || config.publishableKey.includes("HIER_")) { status.textContent = "Das Formular ist noch nicht mit Supabase verbunden."; return; }
  button.disabled = true; status.textContent = "Rückmeldung wird gesendet …";
  try {
    const response = await fetch(`${config.url}/rest/v1/reader_feedback`, { method: "POST", headers: { apikey: config.publishableKey, Authorization: `Bearer ${config.publishableKey}`, "Content-Type": "application/json", Prefer: "return=minimal" }, body: JSON.stringify(payload) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    form.reset(); status.textContent = "Vielen Dank. Ihre Rückmeldung wurde gespeichert.";
  } catch (error) { status.textContent = "Das Senden hat nicht funktioniert. Bitte versuchen Sie es später erneut."; console.error("Feedback submission failed", error); }
  finally { button.disabled = false; }
});

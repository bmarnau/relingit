const config = window.SUPABASE_CONFIG ?? {};
const loginPanel = document.querySelector("#login-panel");
const publishPanel = document.querySelector("#publish-panel");
const statusNode = document.querySelector("#admin-status");
let accessToken = sessionStorage.getItem("reling_admin_token") || "";

function configured() { return config.url && config.publishableKey && !config.publishableKey.includes("HIER_"); }
function setLoggedIn(value) { loginPanel.hidden = value; publishPanel.hidden = !value; }
if (!configured()) statusNode.textContent = "Supabase ist noch nicht in supabase-config.js eingetragen.";
setLoggedIn(Boolean(accessToken));

document.querySelector("#login-form").addEventListener("submit", async (event) => {
  event.preventDefault(); if (!configured()) return;
  statusNode.textContent = "Anmeldung wird geprüft …";
  const response = await fetch(`${config.url}/auth/v1/token?grant_type=password`, { method:"POST", headers:{apikey:config.publishableKey,"Content-Type":"application/json"}, body:JSON.stringify({email:document.querySelector("#admin-email").value,password:document.querySelector("#admin-password").value}) });
  const data = await response.json();
  if (!response.ok) { statusNode.textContent = "Anmeldung fehlgeschlagen. E-Mail und Passwort prüfen."; return; }
  accessToken = data.access_token; sessionStorage.setItem("reling_admin_token", accessToken); setLoggedIn(true); statusNode.textContent = "Angemeldet.";
});

async function upload(file, name, contentType) {
  const response = await fetch(`${config.url}/storage/v1/object/story/current/${name}`, { method:"POST", headers:{apikey:config.publishableKey,Authorization:`Bearer ${accessToken}`,"Content-Type":contentType,"x-upsert":"true"}, body:file });
  if (!response.ok) throw new Error(`${name}: HTTP ${response.status}`);
}

document.querySelector("#publish-form").addEventListener("submit", async (event) => {
  event.preventDefault(); if (!event.currentTarget.reportValidity()) return;
  const button = event.currentTarget.querySelector("button[type='submit']"); button.disabled = true; statusNode.textContent = "Dateien werden hochgeladen …";
  try {
    await upload(document.querySelector("#story-html").files[0], "fahrt-zum-kunden.html", "text/html; charset=utf-8");
    await upload(document.querySelector("#story-pdf").files[0], "geschichte.pdf", "application/pdf");
    const response = await fetch(`${config.url}/rest/v1/story_release?id=eq.current`, { method:"PATCH", headers:{apikey:config.publishableKey,Authorization:`Bearer ${accessToken}`,"Content-Type":"application/json",Prefer:"return=minimal"}, body:JSON.stringify({version:document.querySelector("#version").value.trim(),display_date:document.querySelector("#display-date").value.trim(),page_count:Number(document.querySelector("#page-count").value),published_at:new Date().toISOString()}) });
    if (!response.ok) throw new Error(`Metadaten: HTTP ${response.status}`);
    event.currentTarget.reset(); statusNode.textContent = "Die neue Version ist veröffentlicht.";
  } catch (error) { statusNode.textContent = "Veröffentlichung fehlgeschlagen. Die bisherige Version bleibt angezeigt."; console.error(error); }
  finally { button.disabled = false; }
});

document.querySelector("#logout").addEventListener("click", () => { accessToken=""; sessionStorage.removeItem("reling_admin_token"); setLoggedIn(false); statusNode.textContent="Abgemeldet."; });

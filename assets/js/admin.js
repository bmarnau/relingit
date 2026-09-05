/**
 * Protected release form for the site administrator.
 *
 * Password authentication is followed by a TOTP challenge. PostgreSQL RLS
 * independently requires both the administrator allowlist and an AAL2 JWT.
 * The short-lived access token exists only in sessionStorage.
 */
const config = window.SUPABASE_CONFIG ?? {};
const loginPanel = document.querySelector("#login-panel");
const resetRequestPanel = document.querySelector("#reset-request-panel");
const resetPasswordPanel = document.querySelector("#reset-password-panel");
const mfaPanel = document.querySelector("#mfa-panel");
const mfaEnrollment = document.querySelector("#mfa-enrollment");
const mfaQr = document.querySelector("#mfa-qr");
const publishPanel = document.querySelector("#publish-panel");
const statusNode = document.querySelector("#admin-status");
const tokenStorageKey = "reling_admin_token";

let accessToken = sessionStorage.getItem(tokenStorageKey) || "";
let factorId = "";
let challengeId = "";
let enrollmentPending = false;
let mfaQrObjectUrl = "";
const recoveryParameters = new URLSearchParams(window.location.hash.slice(1));
let recoveryToken = recoveryParameters.get("access_token") || "";

function isConfigured() {
  return Boolean(
    config.url &&
      config.publishableKey &&
      !config.publishableKey.includes("HIER_"),
  );
}

function readJwtPayload(token) {
  try {
    const payload = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(payload));
  } catch {
    return {};
  }
}

function hasUsableToken(token, requiredAal = "aal1") {
  const payload = readJwtPayload(token);
  const isCurrent = Number(payload.exp || 0) * 1000 > Date.now();
  return isCurrent && (requiredAal === "aal1" || payload.aal === requiredAal);
}

function showPanel(name) {
  loginPanel.hidden = name !== "login";
  resetRequestPanel.hidden = name !== "reset-request";
  resetPasswordPanel.hidden = name !== "reset-password";
  mfaPanel.hidden = name !== "mfa";
  publishPanel.hidden = name !== "publish";
}

function recoveryRedirectUrl() {
  return new URL("admin.html", window.location.href).href.split("#")[0];
}

function friendlyLoginError(message = "") {
  if (/invalid login credentials/i.test(message)) {
    return "E-Mail oder Passwort ist nicht korrekt.";
  }
  if (/email not confirmed/i.test(message)) {
    return "Die E-Mail-Adresse wurde in Supabase noch nicht bestätigt.";
  }
  if (/too many requests|rate limit/i.test(message)) {
    return "Zu viele Versuche. Bitte einige Minuten warten.";
  }
  return "Die Anmeldung konnte nicht abgeschlossen werden.";
}

function saveToken(token) {
  accessToken = token;
  sessionStorage.setItem(tokenStorageKey, token);
}

async function authRequest(path, options = {}, token = accessToken) {
  const response = await fetch(`${config.url}/auth/v1${path}`, {
    ...options,
    headers: {
      apikey: config.publishableKey,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });
  const data = response.status === 204 ? {} : await response.json();
  if (!response.ok) {
    throw new Error(data.msg || data.message || data.error_description || "Anfrage fehlgeschlagen");
  }
  return data;
}

async function signIn(email, password) {
  return authRequest(
    "/token?grant_type=password",
    { method: "POST", body: JSON.stringify({ email, password }) },
    "",
  );
}

async function requestPasswordReset(email) {
  const redirectTo = encodeURIComponent(recoveryRedirectUrl());
  return authRequest(
    `/recover?redirect_to=${redirectTo}`,
    { method: "POST", body: JSON.stringify({ email }) },
    "",
  );
}

async function updatePassword(password) {
  return authRequest(
    "/user",
    { method: "PUT", body: JSON.stringify({ password }) },
    recoveryToken,
  );
}

async function createChallenge(id) {
  const challenge = await authRequest(`/factors/${id}/challenge`, {
    method: "POST",
    body: JSON.stringify({}),
  });
  factorId = id;
  challengeId = challenge.id;
}

function showMfaQrCode(qrCode) {
  if (mfaQrObjectUrl) URL.revokeObjectURL(mfaQrObjectUrl);
  mfaQrObjectUrl = "";

  // GoTrue liefert den QR-Code je nach Version als SVG-Text oder als Bild-URL.
  // SVG-Text wird ohne HTML-Injektion in eine lokale, kurzlebige Bild-URL gewandelt.
  // Supabase kann vor dem <svg>-Element zusätzlich eine XML-Deklaration
  // (<?xml ...?>) mitsenden. Beide Formen sind SVG-Text.
  if (qrCode.trimStart().startsWith("<")) {
    mfaQrObjectUrl = URL.createObjectURL(
      new Blob([qrCode], { type: "image/svg+xml" }),
    );
    mfaQr.src = mfaQrObjectUrl;
    return;
  }

  mfaQr.src = qrCode;
}

async function prepareMfa() {
  showPanel("mfa");
  statusNode.textContent = "Zweiter Faktor wird vorbereitet …";

  // Die GoTrue-Benutzerantwort enthält die vorhandenen Faktoren. Ein separates
  // GET /factors ist nicht vorgesehen und wird vom Server mit HTTP 405 abgelehnt.
  const currentUser = await authRequest("/user");
  const totpFactors = (currentUser.factors || []).filter(
    (factor) => factor.factor_type === "totp",
  );
  const verifiedTotp = totpFactors.find(
    (factor) => factor.factor_type === "totp" && factor.status === "verified",
  );

  if (verifiedTotp) {
    enrollmentPending = false;
    mfaEnrollment.hidden = true;
    await createChallenge(verifiedTotp.id);
    statusNode.textContent = "Bitte den Code Ihrer Authenticator-App eingeben.";
    return;
  }

  // Ein abgebrochener erster Einrichtungsversuch hinterlässt einen
  // unbestätigten Faktor. Dessen QR-Geheimnis kann nicht erneut abgerufen
  // werden; deshalb wird nur dieser unbestätigte Faktor vor dem Neuaufbau
  // entfernt. Bestätigte Faktoren werden niemals automatisch gelöscht.
  const unverifiedTotp = totpFactors.find(
    (factor) => factor.status === "unverified",
  );
  if (unverifiedTotp) {
    await authRequest(`/factors/${unverifiedTotp.id}`, { method: "DELETE" });
  }

  const enrollment = await authRequest("/factors", {
    method: "POST",
    body: JSON.stringify({
      factor_type: "totp",
      friendly_name: "Reling IT Veröffentlichung",
      // Der Herausgeber erscheint zusammen mit der E-Mail-Adresse in der
      // Authenticator-App und macht den Eintrag eindeutig auffindbar.
      issuer: "https://berndmarnau.de/relingit",
    }),
  });
  enrollmentPending = true;
  factorId = enrollment.id;
  mfaEnrollment.hidden = false;
  showMfaQrCode(enrollment.totp.qr_code);
  document.querySelector("#mfa-secret").textContent = enrollment.totp.secret;
  await createChallenge(factorId);
  statusNode.textContent = "QR-Code scannen und den ersten Code bestätigen.";
}

async function verifyMfa(code) {
  const verified = await authRequest(`/factors/${factorId}/verify`, {
    method: "POST",
    body: JSON.stringify({ challenge_id: challengeId, code }),
  });
  if (!verified.access_token) throw new Error("Kein bestätigtes Zugriffstoken erhalten");
  saveToken(verified.access_token);
  if (!hasUsableToken(accessToken, "aal2")) {
    throw new Error("Die Sitzung wurde nicht auf AAL2 angehoben");
  }
}

async function uploadStoryFile(file, name, contentType) {
  const response = await fetch(
    `${config.url}/storage/v1/object/story/current/${name}`,
    {
      method: "PUT",
      headers: {
        apikey: config.publishableKey,
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": contentType,
      },
      body: file,
    },
  );

  if (!response.ok) {
    const detail = (await response.text()).trim();
    throw new Error(
      `${name}: HTTP ${response.status}${detail ? ` – ${detail}` : ""}`,
    );
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

  if (!response.ok) throw new Error(`Metadaten: HTTP ${response.status}`);
}

async function logout() {
  if (accessToken) {
    try {
      await authRequest("/logout", { method: "POST" });
    } catch (error) {
      console.warn("Serverseitiges Abmelden fehlgeschlagen", error);
    }
  }
  accessToken = "";
  factorId = "";
  challengeId = "";
  sessionStorage.removeItem(tokenStorageKey);
  showPanel("login");
  statusNode.textContent = "Abgemeldet.";
}

const recoveryError = recoveryParameters.get("error_description");
const isRecoverySession =
  recoveryParameters.get("type") === "recovery" &&
  hasUsableToken(recoveryToken);

if (!isConfigured()) {
  statusNode.textContent =
    "Supabase ist noch nicht in assets/js/supabase-config.js eingetragen.";
  showPanel("login");
} else if (isRecoverySession) {
  window.history.replaceState({}, document.title, recoveryRedirectUrl());
  showPanel("reset-password");
  statusNode.textContent = "Der Rücksetzlink wurde bestätigt. Bitte ein neues Passwort vergeben.";
} else if (recoveryError) {
  showPanel("reset-request");
  statusNode.textContent = "Der Rücksetzlink ist ungültig oder abgelaufen. Bitte einen neuen Link anfordern.";
  window.history.replaceState({}, document.title, recoveryRedirectUrl());
} else if (hasUsableToken(accessToken, "aal2")) {
  showPanel("publish");
} else if (hasUsableToken(accessToken)) {
  prepareMfa().catch(async (error) => {
    console.error(error);
    await logout();
    statusNode.textContent = "Die MFA-Prüfung konnte nicht gestartet werden. Bitte erneut anmelden.";
  });
} else {
  sessionStorage.removeItem(tokenStorageKey);
  accessToken = "";
  showPanel("login");
}

document.querySelector("#login-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!isConfigured()) return;
  statusNode.textContent = "Anmeldung wird geprüft …";

  try {
    const result = await signIn(
      document.querySelector("#admin-email").value,
      document.querySelector("#admin-password").value,
    );
    document.querySelector("#admin-password").value = "";
    saveToken(result.access_token);
    await prepareMfa();
  } catch (error) {
    statusNode.textContent = `Anmeldung fehlgeschlagen: ${friendlyLoginError(error.message)}`;
    console.error(error);
  }
});

document.querySelector("#forgot-password").addEventListener("click", () => {
  document.querySelector("#reset-email").value =
    document.querySelector("#admin-email").value;
  showPanel("reset-request");
  statusNode.textContent = "";
});

document.querySelector("#reset-request-cancel").addEventListener("click", () => {
  showPanel("login");
  statusNode.textContent = "";
});

document.querySelector("#reset-request-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity() || !isConfigured()) return;
  const button = form.querySelector("button[type='submit']");
  button.disabled = true;
  statusNode.textContent = "Rücksetzlink wird angefordert …";

  try {
    await requestPasswordReset(document.querySelector("#reset-email").value.trim());
    form.reset();
    statusNode.textContent =
      "Wenn die Adresse zum Administratorkonto gehört, wurde ein neuer Rücksetzlink gesendet.";
  } catch (error) {
    statusNode.textContent = /too many requests|rate limit/i.test(error.message)
      ? "Zu viele Anfragen. Bitte einige Minuten warten."
      : "Der Rücksetzlink konnte nicht angefordert werden. Bitte später erneut versuchen.";
    console.error(error);
  } finally {
    button.disabled = false;
  }
});

document.querySelector("#reset-password-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity()) return;
  const password = document.querySelector("#new-password").value;
  const confirmation = document.querySelector("#new-password-confirm").value;
  if (password !== confirmation) {
    statusNode.textContent = "Die beiden Passwörter stimmen nicht überein.";
    return;
  }
  const button = form.querySelector("button[type='submit']");
  button.disabled = true;
  statusNode.textContent = "Neues Passwort wird gespeichert …";

  try {
    await updatePassword(password);
    form.reset();
    recoveryToken = "";
    window.history.replaceState({}, document.title, recoveryRedirectUrl());
    showPanel("login");
    statusNode.textContent = "Passwort geändert. Sie können sich jetzt anmelden und MFA einrichten.";
  } catch (error) {
    statusNode.textContent = "Das Passwort konnte nicht geändert werden. Bitte einen neuen Link anfordern.";
    console.error(error);
  } finally {
    button.disabled = false;
  }
});

document.querySelector("#mfa-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity()) return;
  const button = form.querySelector("button[type='submit']");
  button.disabled = true;
  statusNode.textContent = "Authenticator-Code wird geprüft …";

  try {
    await verifyMfa(document.querySelector("#mfa-code").value);
    form.reset();
    mfaEnrollment.hidden = true;
    showPanel("publish");
    statusNode.textContent = enrollmentPending
      ? "MFA ist eingerichtet. Sie dürfen jetzt veröffentlichen."
      : "MFA bestätigt. Sie dürfen jetzt veröffentlichen.";
  } catch (error) {
    statusNode.textContent = "Der Code war ungültig oder abgelaufen. Bitte erneut versuchen.";
    console.error(error);
    try {
      await createChallenge(factorId);
    } catch (challengeError) {
      console.error(challengeError);
      await logout();
    }
  } finally {
    button.disabled = false;
  }
});

document.querySelector("#publish-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity()) return;
  if (!hasUsableToken(accessToken, "aal2")) {
    statusNode.textContent = "Die sichere Sitzung ist abgelaufen. Bitte erneut anmelden.";
    await logout();
    return;
  }

  const submitButton = form.querySelector("button[type='submit']");
  const handoutHtml = form.querySelector("#handout-html").files[0];
  const handoutPdf = form.querySelector("#handout-pdf").files[0];
  if (Boolean(handoutHtml) !== Boolean(handoutPdf)) {
    statusNode.textContent =
      "Bitte für das Handout entweder beide Dateien auswählen oder beide Felder leer lassen.";
    return;
  }
  submitButton.disabled = true;
  statusNode.textContent = "Dateien werden hochgeladen …";

  try {
    await uploadStoryFile(form.querySelector("#story-html").files[0], "fahrt-zum-kunden.html", "text/html; charset=utf-8");
    await uploadStoryFile(form.querySelector("#story-pdf").files[0], "geschichte.pdf", "application/pdf");
    if (handoutHtml && handoutPdf) {
      statusNode.textContent = "Handout wird hochgeladen …";
      await uploadStoryFile(handoutHtml, "workshop-handout.html", "text/html; charset=utf-8");
      await uploadStoryFile(handoutPdf, "workshop-handout.pdf", "application/pdf");
    }
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

document.querySelector("#logout").addEventListener("click", logout);
document.querySelector("#mfa-logout").addEventListener("click", logout);

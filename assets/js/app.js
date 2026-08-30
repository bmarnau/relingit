/**
 * Public landing-page behavior.
 *
 * Supabase supplies the current release and stores optional reader feedback.
 * Local story files remain available as an offline and failure fallback.
 */
const fallbackRelease = {
  version: "1.10",
  date: "29. August 2026",
  pageCount: 46,
};

let release = fallbackRelease;

function hasSupabaseConfig(config) {
  return Boolean(
    config.url &&
      config.publishableKey &&
      !config.publishableKey.includes("HIER_"),
  );
}

function showRelease(current) {
  document.querySelectorAll("[data-version]").forEach((node) => {
    node.textContent = current.version;
  });

  document.querySelectorAll("[data-date]").forEach((node) => {
    node.textContent = current.date;
  });

  const metadata = document.querySelector(".meta");
  if (metadata) {
    metadata.firstChild.textContent =
      `${current.pageCount} Seiten · Bernd Marnau · aktualisiert am `;
  }
}

function setStoryLinks(baseUrl) {
  document.querySelector("#read-link").href =
    `${baseUrl}/fahrt-zum-kunden.html`;
  document.querySelector("#pdf-link").href = `${baseUrl}/geschichte.pdf`;
}

async function loadRelease() {
  const config = window.SUPABASE_CONFIG ?? {};

  if (!hasSupabaseConfig(config)) {
    showRelease(release);
    return;
  }

  try {
    const endpoint =
      `${config.url}/rest/v1/story_release` +
      "?id=eq.current&select=version,display_date,page_count";
    const response = await fetch(endpoint, {
      headers: { apikey: config.publishableKey },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const [current] = await response.json();
    if (current) {
      release = {
        version: current.version,
        date: current.display_date,
        pageCount: current.page_count,
      };
    }

    setStoryLinks(
      `${config.url}/storage/v1/object/public/story/current`,
    );
  } catch (error) {
    console.warn(
      "Aktuelle Version konnte nicht geladen werden; lokale Fassung wird verwendet.",
      error,
    );
  }

  showRelease(release);
}

async function submitFeedback(form, statusNode) {
  const config = window.SUPABASE_CONFIG ?? {};

  if (!hasSupabaseConfig(config)) {
    statusNode.textContent =
      "Das Formular ist noch nicht mit Supabase verbunden.";
    return;
  }

  const submitButton = form.querySelector("button[type='submit']");
  const payload = {
    category: document.querySelector("#kind").value,
    message: document.querySelector("#message").value.trim(),
    story_version: release.version,
  };

  submitButton.disabled = true;
  statusNode.textContent = "Rückmeldung wird gesendet …";

  try {
    const response = await fetch(
      `${config.url}/rest/v1/reader_feedback`,
      {
        method: "POST",
        headers: {
          apikey: config.publishableKey,
          Authorization: `Bearer ${config.publishableKey}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify(payload),
      },
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    form.reset();
    statusNode.textContent =
      "Vielen Dank. Ihre Rückmeldung wurde gespeichert.";
  } catch (error) {
    statusNode.textContent =
      "Das Senden hat nicht funktioniert. Bitte versuchen Sie es später erneut.";
    console.error("Feedback submission failed", error);
  } finally {
    submitButton.disabled = false;
  }
}

const feedbackForm = document.querySelector("#feedback-form");
const feedbackStatus = document.querySelector("#form-status");

feedbackForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!feedbackForm.reportValidity()) return;

  // A filled honeypot strongly indicates an automated submission.
  if (document.querySelector("#website").value) return;

  await submitFeedback(feedbackForm, feedbackStatus);
});

loadRelease();

(function () {
  const form = document.getElementById("quoteForm");
  const statusEl = document.getElementById("quoteStatus");
  const btn = document.getElementById("quoteSubmit");

  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    statusEl.textContent = "";
    btn.disabled = true;
    btn.textContent = "Sending...";

    try {
      const res = await fetch(form.action, {
        method: "POST",
        body: new FormData(form),
        headers: { Accept: "application/json" },
      });

      if (res.ok) {
        form.reset();
        statusEl.textContent = "✅ Thanks! We’ll reach out shortly.";
      } else {
        statusEl.textContent =
          "⚠️ Something went wrong. Please try again or call/text us.";
      }
    } catch (err) {
      statusEl.textContent =
        "⚠️ Network error. Please try again or call/text us.";
    } finally {
      btn.disabled = false;
      btn.textContent = "Submit";
    }
  });
})();

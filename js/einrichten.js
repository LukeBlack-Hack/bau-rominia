(() => {
  const zeichne = (host, { email, geheimnis, codes, onCode }) => {
    host.hidden = false;
    host.replaceChildren();
    const box = document.createElement("div");
    box.className = "auth-card app-box";
    const kicker = document.createElement("p");
    kicker.className = "kicker";
    kicker.textContent = "Authenticator";
    const title = document.createElement("h2");
    title.textContent = "App verbinden.";
    const lead = document.createElement("p");
    lead.className = "hint";
    lead.textContent =
      "Scanne den Code mit einer Authenticator-App, zum Beispiel Google Authenticator. Danach tippst du den 6-stelligen Code. Die Notfallcodes schreibst du auf. Ohne App und ohne Notfallcode lässt sich das Passwort nicht zurücksetzen.";
    const canvas = document.createElement("canvas");
    canvas.className = "qr";
    canvas.setAttribute("role", "img");
    canvas.setAttribute("aria-label", "QR-Code für die Authenticator-App");
    const url = `otpauth://totp/${encodeURIComponent("Bau Rominia")}:${encodeURIComponent(email)}?secret=${encodeURIComponent(geheimnis)}&issuer=${encodeURIComponent("Bau Rominia")}`;
    window.BauQr.zeichne(canvas, url);
    const key = document.createElement("p");
    key.className = "app-key";
    key.textContent = geheimnis;
    const list = document.createElement("ul");
    list.className = "code-liste";
    codes.forEach((item) => {
      const li = document.createElement("li");
      li.textContent = item;
      list.append(li);
    });
    const label = document.createElement("label");
    label.append(document.createTextNode("Code aus der App"));
    const input = document.createElement("input");
    input.inputMode = "numeric";
    input.autocomplete = "one-time-code";
    input.maxLength = 6;
    label.append(input);
    const row = document.createElement("div");
    row.className = "form-row";
    const button = document.createElement("button");
    button.className = "btn btn-solid";
    button.type = "button";
    button.textContent = "App bestätigen";
    const status = document.createElement("p");
    status.className = "form-status";
    status.setAttribute("role", "status");
    button.addEventListener("click", async () => {
      try {
        await onCode(input.value);
      } catch (error) {
        status.textContent = error.message;
        status.classList.add("is-error");
      }
    });
    row.append(button, status);
    box.append(kicker, title, lead, canvas, key, list, label, row);
    host.append(box);
    input.focus();
  };

  const weiter = async (ergebnis, { panel, onFertig, status }) => {
    if (!ergebnis || ergebnis.fertig) {
      const host = panel.querySelector("[data-app]");
      if (host) host.hidden = true;
      if (ergebnis?.user) onFertig(ergebnis.user);
      return;
    }
    if (ergebnis.schritt === "code") {
      const feld = panel.querySelector("[data-code-feld]");
      if (feld) {
        feld.hidden = false;
        const input = feld.querySelector("input");
        input.disabled = false;
        input.focus();
      }
      status("Code aus der Authenticator-App oder ein Notfallcode.", false);
      return;
    }
    if (ergebnis.schritt === "einrichten") {
      panel.querySelectorAll("form").forEach((form) => {
        form.hidden = true;
      });
      const tabs = panel.querySelector(".switch");
      if (tabs) tabs.hidden = true;
      zeichne(panel.querySelector("[data-app]"), {
        email: ergebnis.email,
        geheimnis: ergebnis.geheimnis,
        codes: ergebnis.codes,
        onCode: async (code) => {
          const user = await window.BauRominia.einrichtungBestaetigen(code);
          panel.querySelector("[data-app]").hidden = true;
          if (tabs) tabs.hidden = false;
          onFertig(user);
        },
      });
    }
  };

  window.BauEinrichten = { weiter };
})();

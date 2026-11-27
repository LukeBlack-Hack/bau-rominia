(() => {
  const form = document.querySelector("[data-calc]");
  const office = document.querySelector("[data-office]");
  const lock = document.querySelector("[data-lock]");
  const offen = window.BauRominia?.istBesitzer?.() === true;
  if (office) office.hidden = !offen;
  if (lock) lock.hidden = offen;
  if (!form || !offen) return;

  const draftKey = "bau-rominia-kalkulation-entwurf";
  const listKey = "bau-rominia-kalkulationen";
  const anfrageKey = "bau-rominia-anfragen";
  const euro = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" });
  const mengeFmt = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 1 });
  const status = form.querySelector("[data-status]");
  const saved = document.querySelector("[data-saved]");
  const extraBox = form.querySelector("[data-extras]");
  const wahl = form.querySelector("[data-anfrage-wahl]");
  const wahlListe = form.querySelector("[data-anfrage-liste]");
  let extras = [];
  let leute = [];
  let anfrageZiel = null;
  const leuteBox = form.querySelector("[data-leute]");
  const MODELL = {
    werktage: 261,
    urlaub: 30,
    feiertage: 10,
    ausfall: 10,
    mindest: 9,
    abgabe: 0.26,
    fahrzeugMonat: 450,
    euroKm: 0.2,
    psaJahr: 400,
    betriebMonat: 250,
  };
  MODELL.abrechenbar = MODELL.werktage - MODELL.urlaub - MODELL.feiertage - MODELL.ausfall;
  MODELL.stundenJahr = MODELL.abrechenbar * MODELL.mindest;
  MODELL.stundenMonat = MODELL.stundenJahr / 12;
  const kostenStunde = (brutto) => {
    const bezahlt = MODELL.werktage * MODELL.mindest;
    return (brutto * bezahlt * (1 + MODELL.abgabe)) / MODELL.stundenJahr;
  };
  const zuschlagSatzFuer = (schicht) => (schicht === "nacht" ? 0.25 : schicht === "wochenende" ? 0.5 : 0);

  const fields = [
    "baustelle",
    "gewerk",
    "helfer",
    "vorarbeiter",
    "stunden",
    "tage",
    "tageTag",
    "tageNacht",
    "tageWochenende",
    "satzHelfer",
    "satzVorarbeiter",
    "anfahrt",
    "unterkunft",
    "naechte",
    "schicht",
    "aufschlag",
    "kilometer",
    "fahrten",
    "zuschlag",
    "lohnHelfer",
    "lohnVorarbeiter",
    "fahrt",
    "unterkunftKosten",
    "psa",
    "psaKosten",
    "urlaub",
    "krankheit",
    "feiertage",
    "lohnnebenkosten",
    "sonstigesName",
    "sonstiges",
    "sonstigesKosten",
    "mwst",
  ];

  const num = (name) => {
    const raw = String(form.elements[name]?.value ?? "").replace(",", ".");
    const value = Number(raw);
    return Number.isFinite(value) && value > 0 ? value : 0;
  };

  const betrag = (raw) => {
    const value = Number(String(raw ?? "").replace(",", "."));
    return Number.isFinite(value) && value > 0 ? value : 0;
  };

  const runde = (wert) => Math.round((Number(wert) || 0) * 100) / 100;

  const read = () => {
    const values = {};
    fields.forEach((name) => {
      const field = form.elements[name];
      values[name] = field?.type === "checkbox" ? field.checked : field?.value ?? "";
    });
    return values;
  };

  const write = (values) => {
    if (values.tageTag == null && values.tageNacht == null && values.tageWochenende == null && values.tage != null) {
      const art = values.schicht === "nacht" || values.schicht === "wochenende" ? values.schicht : "tag";
      values = {
        ...values,
        tageTag: art === "tag" ? values.tage : "0",
        tageNacht: art === "nacht" ? values.tage : "0",
        tageWochenende: art === "wochenende" ? values.tage : "0",
      };
    }
    fields.forEach((name) => {
      const field = form.elements[name];
      if (!field || values[name] == null) return;
      if (field.type === "checkbox") field.checked = Boolean(values[name]);
      else field.value = values[name];
    });
  };

  const syncSonstiges = () => {
    const erste = extras[0];
    if (!form.elements.sonstigesName) return;
    form.elements.sonstigesName.value = erste?.name || "";
    form.elements.sonstiges.value = erste && erste.verkauf !== "" && erste.verkauf != null ? erste.verkauf : "0";
    form.elements.sonstigesKosten.value = erste && erste.kosten !== "" && erste.kosten != null ? erste.kosten : "0";
  };

  const extraVomDom = () => {
    if (!extraBox || extraBox.dataset.bereit !== "1") return;
    extras = [...extraBox.querySelectorAll("[data-extra]")].map((row) => ({
      name: row.querySelector("[data-extra-name]")?.value ?? "",
      verkauf: row.querySelector("[data-extra-vk]")?.value ?? "",
      kosten: row.querySelector("[data-extra-kosten]")?.value ?? "",
    }));
  };

  const extraFeld = (label, value, key, zahl) => {
    const wrap = document.createElement("label");
    wrap.className = key === "extraName" ? "extra-name" : "";
    wrap.append(document.createTextNode(label));
    const input = document.createElement("input");
    input.value = value ?? "";
    if (zahl) {
      input.type = "number";
      input.min = "0";
      input.step = "0.01";
      input.inputMode = "decimal";
    } else {
      input.type = "text";
      input.autocomplete = "off";
      input.placeholder = "z. B. Entsorgung";
    }
    input.dataset[key] = "";
    wrap.append(input);
    return wrap;
  };

  const extraZeichnen = () => {
    if (!extraBox) return;
    extraBox.dataset.bereit = "1";
    extraBox.replaceChildren(
      ...extras.map((eintrag, index) => {
        const row = document.createElement("div");
        row.className = "extra-zeile";
        row.dataset.extra = String(index);
        row.append(
          extraFeld("Bezeichnung", eintrag.name, "extraName", false),
          extraFeld("Verkauf €", eintrag.verkauf, "extraVk", true),
          extraFeld("Eigene Kosten €", eintrag.kosten, "extraKosten", true)
        );
        const weg = document.createElement("button");
        weg.type = "button";
        weg.className = "btn btn-line";
        weg.dataset.extraDrop = String(index);
        weg.textContent = "Entfernen";
        row.append(weg);
        return row;
      })
    );
  };

  const normalisiere = (liste) =>
    (Array.isArray(liste) ? liste : []).map((item) => ({
      name: String(item?.name || ""),
      verkauf: item?.verkauf == null ? "" : String(item.verkauf),
      kosten: item?.kosten == null ? "" : String(item.kosten),
    }));

  const migriere = (values) => {
    if (Array.isArray(values?.extras) && values.extras.length) {
      return values.extras.map((item) => ({
        name: String(item?.name || ""),
        verkauf: item?.verkauf == null ? "" : String(item.verkauf),
        kosten: item?.kosten == null ? "" : String(item.kosten),
      }));
    }
    const name = String(values?.sonstigesName || "");
    const verkauf = values?.sonstiges == null ? "0" : String(values.sonstiges);
    const kosten = values?.sonstigesKosten == null ? "0" : String(values.sonstigesKosten);
    if (name.trim() || betrag(verkauf) > 0 || betrag(kosten) > 0) return [{ name, verkauf, kosten }];
    return [];
  };

  const extrasSetzen = (liste) => {
    extras = normalisiere(liste);
    extraZeichnen();
    syncSonstiges();
  };

  const leuteVomDom = () => {
    if (!leuteBox || leuteBox.dataset.bereit !== "1") return;
    leute = [...leuteBox.querySelectorAll("[data-person]")].map((row) => ({
      name: row.querySelector("[data-person-name]")?.value ?? "",
      lohn: row.querySelector("[data-person-lohn]")?.value ?? "",
    }));
  };

  const leuteZeichnen = () => {
    if (!leuteBox) return;
    leuteBox.dataset.bereit = "1";
    leuteBox.replaceChildren(
      ...leute.map((person, index) => {
        const row = document.createElement("div");
        row.className = "extra-zeile";
        row.dataset.person = String(index);
        const name = document.createElement("input");
        name.dataset.personName = "";
        name.value = person.name || "";
        name.placeholder = "Name";
        name.autocomplete = "off";
        const lohn = document.createElement("input");
        lohn.dataset.personLohn = "";
        lohn.type = "number";
        lohn.min = "0";
        lohn.step = "0.01";
        lohn.inputMode = "decimal";
        lohn.value = person.lohn ?? "";
        lohn.setAttribute("aria-label", "Bruttolohn");
        const weg = document.createElement("button");
        weg.type = "button";
        weg.className = "btn btn-line";
        weg.dataset.personDrop = String(index);
        weg.textContent = "Weg";
        row.append(name, lohn, weg);
        return row;
      })
    );
  };

  const leuteSetzen = (liste) => {
    leute = (Array.isArray(liste) ? liste : []).map((item) => ({
      name: String(item?.name || ""),
      lohn: item?.lohn == null ? "" : String(item.lohn),
    }));
    leuteZeichnen();
  };

  const prozentText = (name) => `${mengeFmt.format(num(name))} %`;

  const rechnen = () => {
    const helfer = num("helfer");
    const vorarbeiter = num("vorarbeiter");
    const mindestStunden = MODELL.mindest;
    const gearbeitet = num("stunden");
    const stunden = gearbeitet > 0 ? Math.max(gearbeitet, mindestStunden) : 0;
    const schichten = [
      { name: "Tag", tage: num("tageTag"), satz: 0 },
      { name: "Nacht", tage: num("tageNacht"), satz: 0.25 },
      { name: "Wochenende", tage: num("tageWochenende"), satz: 0.5 },
    ];
    const tage = schichten.reduce((summe, schicht) => summe + schicht.tage, 0);
    const aufschlag = form.elements.aufschlag ? num("aufschlag") / 100 : 0.2;
    const verkaufAus = (kosten) => runde(kosten * (1 + aufschlag));
    const stundenText = (gesamt) =>
      gearbeitet > 0 && gearbeitet < mindestStunden
        ? `${mengeFmt.format(gesamt)} h, mind. ${mengeFmt.format(mindestStunden)}`
        : `${mengeFmt.format(gesamt)} h`;
    const gruppen = [
      { name: "Helfer", anzahl: helfer, lohn: num("lohnHelfer") },
      { name: "Vorarbeiter", anzahl: vorarbeiter, lohn: num("lohnVorarbeiter") },
    ];
    leute.forEach((person) => {
      const lohn = betrag(person.lohn);
      const name = String(person.name || "").trim();
      if (!name && lohn === 0) return;
      gruppen.push({ name: name || "Person", anzahl: 1, lohn });
    });
    const personen = gruppen.reduce((summe, gruppe) => summe + gruppe.anzahl, 0);
    const stundenGesamt = gruppen.reduce((summe, gruppe) => summe + gruppe.anzahl * stunden * tage, 0);
    const fahrzeugStunden = stunden * tage;
    const fahrzeugKosten = runde(fahrzeugStunden * (MODELL.fahrzeugMonat / MODELL.stundenMonat));
    const spritKosten = runde(num("kilometer") * num("fahrten") * MODELL.euroKm);
    const naechte = num("naechte");
    const unterkunftKosten = runde(personen * num("unterkunft") * naechte);
    const eigene = extras.map((eintrag) => ({
      name: String(eintrag.name || "").trim(),
      vk: runde(betrag(eintrag.verkauf)),
      kosten: runde(betrag(eintrag.kosten)),
    }));
    const zeilen = [];
    const kunden = [];
    let personalKosten = 0;
    let psaKosten = 0;
    let betriebKosten = 0;
    gruppen.forEach((gruppe) => {
      const mengeStunden = gruppe.anzahl * stunden * tage;
      if (mengeStunden <= 0 || gruppe.lohn <= 0) return;
      const kosten = runde(mengeStunden * kostenStunde(gruppe.lohn));
      const psa = runde(mengeStunden * (MODELL.psaJahr / MODELL.stundenJahr));
      const betrieb = runde(mengeStunden * (MODELL.betriebMonat / MODELL.stundenMonat));
      const fahrzeugAnteil = stundenGesamt > 0 ? fahrzeugKosten * (mengeStunden / stundenGesamt) : 0;
      personalKosten += kosten;
      psaKosten += psa;
      betriebKosten += betrieb;
      zeilen.push({
        name: `${gruppe.name}, Lohn und Abgaben`,
        menge: stundenText(mengeStunden),
        verkauf: verkaufAus(kosten),
        kosten,
      });
      const stundenVerkauf = runde(verkaufAus(kosten) + verkaufAus(psa) + verkaufAus(betrieb) + verkaufAus(fahrzeugAnteil));
      kunden.push({ name: gruppe.name, menge: stundenText(mengeStunden), betrag: stundenVerkauf });
      schichten.forEach((schicht) => {
        if (schicht.satz <= 0 || schicht.tage <= 0) return;
        const zuschlagStunden = gruppe.anzahl * stunden * schicht.tage;
        const zuschlagKosten = runde(zuschlagStunden * kostenStunde(gruppe.lohn) * schicht.satz);
        const name = `${schicht.name === "Nacht" ? "Nachtzuschlag 25 %" : "Wochenendzuschlag 50 %"}, ${gruppe.name}`;
        zeilen.push({ name, menge: stundenText(zuschlagStunden), verkauf: verkaufAus(zuschlagKosten), kosten: zuschlagKosten });
        kunden.push({ name, menge: stundenText(zuschlagStunden), betrag: verkaufAus(zuschlagKosten) });
      });
    });
    if (psaKosten > 0) zeilen.push({ name: "PSA", menge: stundenText(stundenGesamt), verkauf: verkaufAus(psaKosten), kosten: runde(psaKosten) });
    if (betriebKosten > 0) zeilen.push({ name: "Betrieb", menge: stundenText(stundenGesamt), verkauf: verkaufAus(betriebKosten), kosten: runde(betriebKosten) });
    if (fahrzeugKosten > 0) zeilen.push({ name: "Fahrzeug", menge: `${mengeFmt.format(fahrzeugStunden)} h`, verkauf: verkaufAus(fahrzeugKosten), kosten: fahrzeugKosten });
    if (spritKosten > 0) {
      zeilen.push({
        name: "Kilometer",
        menge: `${mengeFmt.format(num("kilometer"))} km × ${mengeFmt.format(num("fahrten"))}`,
        verkauf: verkaufAus(spritKosten),
        kosten: spritKosten,
      });
      kunden.push({
        name: "An- und Abreise",
        menge: `${mengeFmt.format(num("kilometer"))} km × ${mengeFmt.format(num("fahrten"))}`,
        betrag: verkaufAus(spritKosten),
      });
    }
    if (naechte > 0) {
      zeilen.push({
        name: "Übernachtung",
        menge: `${mengeFmt.format(personen)} × ${mengeFmt.format(naechte)}`,
        verkauf: verkaufAus(unterkunftKosten),
        kosten: unterkunftKosten,
      });
      kunden.push({
        name: "Übernachtung",
        menge: `${mengeFmt.format(personen)} × ${mengeFmt.format(naechte)}`,
        betrag: verkaufAus(unterkunftKosten),
      });
    }
    eigene.forEach((eintrag) => {
      if (!eintrag.name && eintrag.vk === 0 && eintrag.kosten === 0) return;
      zeilen.push({
        name: eintrag.name || "Weitere Position",
        menge: "1 psch",
        verkauf: eintrag.vk,
        kosten: eintrag.kosten,
      });
      if (eintrag.vk > 0) kunden.push({ name: eintrag.name || "Weitere Position", menge: "1 psch", betrag: eintrag.vk });
    });
    const netto = runde(zeilen.reduce((summe, zeile) => summe + zeile.verkauf, 0));
    const kosten = runde(zeilen.reduce((summe, zeile) => summe + zeile.kosten, 0));
    const mwstAn = Boolean(form.elements.mwst?.checked);
    const mwst = mwstAn ? runde(netto * 0.19) : 0;
    const uebrig = runde(netto - kosten);
    const helferSatz = kostenStunde(num("lohnHelfer"));
    const satzInfo =
      num("lohnHelfer") > 0
        ? `Helfer intern ${euro.format(helferSatz)} / h. Verkauf mit ${mengeFmt.format(aufschlag * 100)} % Aufschlag ${euro.format(helferSatz * (1 + aufschlag))} / h, ohne Fahrzeug, PSA und Betrieb.`
        : "";
    return {
      baustelle: String(form.elements.baustelle?.value || "").trim() || "Ohne Baustelle",
      gewerk: String(form.elements.gewerk?.value || "").trim(),
      gearbeitet,
      mindestStunden,
      stunden,
      schicht: schichten.filter((schicht) => schicht.tage > 0).map((schicht) => schicht.name).join(", "),
      personen,
      naechte,
      zeilen,
      kunden,
      eigene,
      satzInfo,
      netto,
      mwstAn,
      mwst,
      brutto: runde(netto + mwst),
      kosten,
      uebrig,
      marge: netto > 0 ? (uebrig / netto) * 100 : 0,
      personalKosten,
    };
  };

  const setzen = (name, text) => {
    const node = document.querySelector(`[data-${name}]`);
    if (node) node.textContent = text;
  };

  const zelle = (text, nummer) => {
    const td = document.createElement("td");
    td.textContent = text;
    if (nummer) td.className = "num";
    return td;
  };

  const position = (pos, name, mengeText, ansatz, kosten) => {
    const tr = document.createElement("tr");
    tr.append(zelle(pos), zelle(name), zelle(mengeText, true), zelle(euro.format(ansatz), true), zelle(euro.format(kosten), true));
    return tr;
  };

  const positionKunde = (pos, name, mengeText, ansatz) => {
    const tr = document.createElement("tr");
    tr.append(zelle(pos), zelle(name), zelle(mengeText, true), zelle(euro.format(ansatz), true));
    return tr;
  };

  const zeichnen = () => {
    extraVomDom();
    leuteVomDom();
    const ergebnis = rechnen();
    setzen("netto", euro.format(ergebnis.netto));
    setzen("blatt-ort", ergebnis.baustelle);
    setzen("mwst", euro.format(ergebnis.mwst));
    setzen("brutto", euro.format(ergebnis.brutto));
    setzen("kosten", euro.format(ergebnis.kosten));
    setzen("uebrig", euro.format(ergebnis.uebrig));
    setzen("marge", `${mengeFmt.format(ergebnis.marge)} %`);
    setzen("kunde-ort", ergebnis.baustelle);
    setzen("kunde-netto", euro.format(ergebnis.netto));
    setzen("kunde-mwst", euro.format(ergebnis.mwst));
    setzen("kunde-brutto", euro.format(ergebnis.brutto));
    setzen("kunde-gewerk", ergebnis.gewerk);
    const satzInfo = document.querySelector("[data-satz-info]");
    if (satzInfo) {
      satzInfo.hidden = !ergebnis.satzInfo;
      satzInfo.textContent = ergebnis.satzInfo || "";
    }
    const fuer = document.querySelector("[data-blatt-fuer]");
    const kundeFuer = document.querySelector("[data-kunde-fuer]");
    if (fuer && kundeFuer) {
      kundeFuer.hidden = fuer.hidden || !fuer.textContent.trim();
      kundeFuer.textContent = fuer.hidden ? "" : fuer.textContent;
    }
    const body = document.querySelector("[data-positionen]");
    const posten = ergebnis.zeilen.length
      ? ergebnis.zeilen.map((zeile, index) => position(String(index + 1).padStart(2, "0"), zeile.name, zeile.menge, zeile.verkauf, zeile.kosten))
      : [position("–", "Noch keine Position", "–", 0, 0)];
    body?.replaceChildren(...posten);
    const kunde = ergebnis.kunden.filter((zeile) => zeile.betrag > 0);
    const kundeBody = document.querySelector("[data-kunde-positionen]");
    const kundeZeilen = kunde.length
      ? kunde.map((eintrag, index) => positionKunde(String(index + 1).padStart(2, "0"), eintrag.name, eintrag.menge, eintrag.betrag))
      : [positionKunde("–", "Noch keine Position", "–", 0)];
    kundeBody?.replaceChildren(...kundeZeilen);
    form.querySelector("[data-zuschlag]")?.classList.toggle("is-off", ergebnis.schicht === "tag");
    const mwstZeile = document.querySelector("[data-mwst-row]");
    const bruttoZeile = document.querySelector("[data-brutto-row]");
    const kundeMwst = document.querySelector("[data-kunde-mwst-row]");
    const kundeBrutto = document.querySelector("[data-kunde-brutto-row]");
    if (mwstZeile) mwstZeile.hidden = !ergebnis.mwstAn;
    if (bruttoZeile) bruttoZeile.hidden = !ergebnis.mwstAn;
    if (kundeMwst) kundeMwst.hidden = !ergebnis.mwstAn;
    if (kundeBrutto) kundeBrutto.hidden = !ergebnis.mwstAn;
    document.querySelector("[data-uebrig]")?.classList.toggle("is-neg", ergebnis.uebrig < 0);
    return ergebnis;
  };

  const lesenListe = () => {
    try {
      const liste = JSON.parse(localStorage.getItem(listKey) || "[]");
      return Array.isArray(liste) ? liste : [];
    } catch {
      return [];
    }
  };

  const anfragenLesen = () => {
    try {
      const liste = JSON.parse(localStorage.getItem(anfrageKey) || "[]");
      return Array.isArray(liste) ? liste : [];
    } catch {
      return [];
    }
  };

  const schluessel = (eintrag) => {
    if (!eintrag || typeof eintrag !== "object") return "";
    if (eintrag.id) return `id:${eintrag.id}`;
    return `zeit:${eintrag.zeit || ""}|${String(eintrag.baustelle || "").trim()}`;
  };

  const listeZeichnen = () => {
    const liste = lesenListe();
    if (!saved) return;
    if (!liste.length) {
      saved.replaceChildren(Object.assign(document.createElement("li"), { textContent: "Noch keine Kalkulation gemerkt." }));
      return;
    }
    saved.replaceChildren(
      ...liste.map((eintrag) => {
        const item = document.createElement("li");
        item.className = "calc-item";
        const laden = document.createElement("button");
        laden.type = "button";
        laden.className = "text-link";
        laden.dataset.load = eintrag.id;
        const wann = new Date(eintrag.zeit).toLocaleString("de-DE", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
        laden.textContent = `${eintrag.baustelle} · ${eintrag.gewerk} · ${euro.format(eintrag.netto)} · übrig ${euro.format(eintrag.uebrig)} · ${wann}`;
        const loeschen = document.createElement("button");
        loeschen.type = "button";
        loeschen.className = "btn btn-line";
        loeschen.dataset.drop = eintrag.id;
        loeschen.textContent = "Löschen";
        item.append(laden, loeschen);
        return item;
      })
    );
  };

  const entwurfSichern = () => {
    extraVomDom();
    leuteVomDom();
    syncSonstiges();
    const payload = read();
    payload.extraPositionen = extras.map((eintrag) => ({
      name: eintrag.name,
      verkauf: eintrag.verkauf,
      kosten: eintrag.kosten,
    }));
    payload.leute = leute.map((person) => ({ name: person.name, lohn: person.lohn }));
    payload.anfrageZiel = anfrageZiel;
    localStorage.setItem(draftKey, JSON.stringify(payload));
  };

  const zielSetzen = (wert) => {
    if (wert && typeof wert === "object") {
      anfrageZiel = schluessel(wert) || null;
      return;
    }
    anfrageZiel = typeof wert === "string" && wert ? wert : null;
  };

  try {
    const entwurf = JSON.parse(localStorage.getItem(draftKey) || "null");
    if (entwurf && typeof entwurf === "object") {
      write(entwurf);
      extrasSetzen(Array.isArray(entwurf.extraPositionen) ? entwurf.extraPositionen : migriere(entwurf));
      leuteSetzen(entwurf.leute);
      zielSetzen(entwurf.anfrageZiel);
    }
  } catch {
    /* Entwurf bleibt das Beispiel aus der Seite. */
  }

  const zahl = (wert) => {
    if (wert == null || String(wert).trim() === "") return null;
    const value = Number(String(wert).replace(",", "."));
    return Number.isFinite(value) && value >= 0 ? value : null;
  };

  const datum = (wert) => {
    if (!wert) return "";
    const date = new Date(wert);
    if (Number.isNaN(date.getTime())) return String(wert);
    return date.toLocaleDateString("de-DE");
  };

  const zeige = (name, text) => {
    const node = document.querySelector(`[data-${name}]`);
    if (!node) return;
    const inhalt = String(text || "").trim();
    node.hidden = !inhalt;
    node.textContent = inhalt;
  };

  const tageZwischen = (startText, endeText) => {
    const start = startText ? new Date(`${startText}T12:00:00`) : null;
    const ende = endeText ? new Date(`${endeText}T12:00:00`) : null;
    if (start && ende && !Number.isNaN(start.getTime()) && !Number.isNaN(ende.getTime())) {
      const spanne = Math.round((ende - start) / 86400000) + 1;
      if (spanne > 0 && spanne < 400) return spanne;
    }
    if (start && !Number.isNaN(start.getTime())) return 1;
    return null;
  };

  const schichtAus = (wert) => {
    const text = String(wert || "").toLowerCase();
    if (text.includes("nacht")) return "nacht";
    if (text.includes("wochenende")) return "wochenende";
    return "tag";
  };

  try {
    const roh = sessionStorage.getItem("bau-rominia-aus-anfrage");
    if (roh) {
      sessionStorage.removeItem("bau-rominia-aus-anfrage");
      const anfrage = JSON.parse(roh);
      const personen = zahl(anfrage.personen);
      const vorarbeiterFeld = zahl(anfrage.vorarbeiter);
      let helfer = personen;
      let vorarbeiter = vorarbeiterFeld;
      if (vorarbeiter == null) {
        if (/vorarbeiter/i.test(String(anfrage.funktion || "")) && personen != null && personen > 0) {
          vorarbeiter = 1;
          helfer = Math.max(personen - 1, 0);
        } else {
          vorarbeiter = 0;
        }
      }
      const tage = tageZwischen(anfrage.start, anfrage.ende);
      const stunden = zahl(anfrage.stunden);
      const text = `${anfrage.unterkunft || ""} ${anfrage.nachricht || ""}`.toLowerCase();
      const willUnterkunft = anfrage.unterkunft === "ja" || /unterkunft|übernacht|uebernacht|hotel|pension/.test(text);
      const gewerk = [...form.elements.gewerk.options].some((option) => option.value === anfrage.gewerk)
        ? anfrage.gewerk
        : form.elements.gewerk.value;
      const naechste = {
        ...read(),
        baustelle: anfrage.baustelle || anfrage.baustelleStandort || anfrage.wohnort || "",
        gewerk,
        vorarbeiter: String(vorarbeiter ?? 0),
        naechte: willUnterkunft ? String(tage || 1) : "0",
        tageTag: schichtAus(anfrage.schicht) === "tag" ? String(tage || 0) : "0",
        tageNacht: schichtAus(anfrage.schicht) === "nacht" ? String(tage || 0) : "0",
        tageWochenende: schichtAus(anfrage.schicht) === "wochenende" ? String(tage || 0) : "0",
      };
      if (helfer != null) naechste.helfer = String(helfer);
      if (tage != null) naechste.tage = String(tage);
      if (stunden != null) naechste.stunden = String(stunden);
      write(naechste);
      if (anfrage.art !== "fachkraft") zielSetzen(anfrage);
      const kopf = [
        anfrage.firma,
        anfrage.baustelleStandort,
        [datum(anfrage.start), datum(anfrage.ende)].filter(Boolean).join(" – "),
        anfrage.schicht,
      ]
        .map((teil) => String(teil || "").trim())
        .filter(Boolean)
        .join(" · ");
      zeige("blatt-fuer", kopf);
      const hinweis = [anfrage.funktion, anfrage.nachricht]
        .map((teil) => String(teil || "").trim())
        .filter(Boolean)
        .join(" · ");
      zeige("blatt-hinweis", hinweis ? `Aus der Anfrage: ${hinweis}` : "");
      if (status) status.textContent = "Vorlage aus der Anfrage. Die Preise sind eure Sätze, bitte kurz prüfen.";
    }
  } catch {
    /* Ohne Anfrage bleibt der Entwurf. */
  }

  const angebotAus = (ergebnis) => ({
    zeit: new Date().toISOString(),
    baustelle: ergebnis.baustelle,
    gewerk: ergebnis.gewerk,
    netto: ergebnis.netto,
    positionen: ergebnis.kunden.filter((eintrag) => eintrag.betrag > 0).map((eintrag) => ({
      name: eintrag.name,
      menge: eintrag.menge,
      betrag: eintrag.betrag,
    })),
  });

  const anhaengenAn = (eintrag) => {
    const liste = anfragenLesen();
    const index = liste.findIndex((item) => schluessel(item) === schluessel(eintrag));
    if (index < 0 || liste[index].art === "fachkraft") {
      if (status) {
        status.textContent = "Diese Anfrage liegt nicht mehr in diesem Browser.";
        status.classList.add("is-error");
      }
      return;
    }
    const ergebnis = zeichnen();
    liste[index] = { ...liste[index], angebot: angebotAus(ergebnis) };
    localStorage.setItem(anfrageKey, JSON.stringify(liste));
    zielSetzen(liste[index]);
    entwurfSichern();
    if (wahl) wahl.hidden = true;
    const titel = String(liste[index].baustelle || liste[index].firma || liste[index].name || "der Anfrage").trim();
    if (status) {
      status.textContent = `Angebot hängt an ${titel}. Es liegt nur in diesem Browser, es geht keine E-Mail raus.`;
      status.classList.remove("is-error");
    }
  };

  const wahlZeigen = () => {
    if (!wahl || !wahlListe) return;
    const liste = anfragenLesen().filter((eintrag) => eintrag.art !== "fachkraft");
    wahl.hidden = false;
    if (!liste.length) {
      const leer = document.createElement("p");
      leer.className = "calc-note";
      leer.textContent = "Keine Auftraggeber-Anfrage in diesem Browser.";
      wahlListe.replaceChildren(leer);
      return;
    }
    wahlListe.replaceChildren(
      ...liste
        .slice()
        .reverse()
        .map((eintrag) => {
          const knopf = document.createElement("button");
          knopf.type = "button";
          knopf.className = "btn btn-line";
          const wann = eintrag.zeit
            ? new Date(eintrag.zeit).toLocaleString("de-DE", {
                day: "2-digit",
                month: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
              })
            : "";
          knopf.textContent = [eintrag.firma, eintrag.baustelle || eintrag.name, wann].filter((teil) => String(teil || "").trim()).join(" · ") || "Anfrage";
          knopf.addEventListener("click", () => anhaengenAn(eintrag));
          return knopf;
        })
    );
  };

  form.addEventListener("input", () => {
    zeichnen();
    entwurfSichern();
    if (status) {
      status.textContent = "";
      status.classList.remove("is-error");
    }
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    extraVomDom();
    syncSonstiges();
    const values = read();
    const baustelle = String(values.baustelle || "").trim();
    if (!baustelle) {
      status.textContent = "Trag zuerst die Baustelle ein.";
      status.classList.add("is-error");
      form.elements.baustelle.focus();
      return;
    }
    const ergebnis = zeichnen();
    const liste = lesenListe();
    liste.unshift({
      id: `k-${Date.now()}`,
      zeit: new Date().toISOString(),
      baustelle,
      gewerk: values.gewerk,
      netto: ergebnis.netto,
      uebrig: ergebnis.uebrig,
      values: read(),
      extraPositionen: extras.map((eintrag) => ({ ...eintrag })),
      leute: leute.map((person) => ({ ...person })),
      anfrageZiel,
    });
    localStorage.setItem(listKey, JSON.stringify(liste.slice(0, 30)));
    entwurfSichern();
    listeZeichnen();
    status.textContent = "Gemerkt. Die Kalkulation liegt in diesem Browser.";
    status.classList.remove("is-error");
  });

  saved?.addEventListener("click", (event) => {
    const ziel = event.target.closest("button");
    if (!ziel) return;
    const liste = lesenListe();
    if (ziel.dataset.load) {
      const eintrag = liste.find((item) => item.id === ziel.dataset.load);
      if (!eintrag?.values) return;
      write(eintrag.values);
      extrasSetzen(
        Array.isArray(eintrag.extraPositionen)
          ? eintrag.extraPositionen
          : Array.isArray(eintrag.values.extraPositionen)
            ? eintrag.values.extraPositionen
            : migriere(eintrag.values)
      );
      leuteSetzen(eintrag.leute || eintrag.values.leute);
      zielSetzen(eintrag.anfrageZiel || eintrag.values.anfrageZiel);
      zeige("blatt-fuer", "");
      zeige("blatt-hinweis", "");
      zeichnen();
      entwurfSichern();
      status.textContent = `${eintrag.baustelle} ist wieder geladen.`;
      status.classList.remove("is-error");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
    if (ziel.dataset.drop) {
      localStorage.setItem(
        listKey,
        JSON.stringify(liste.filter((item) => item.id !== ziel.dataset.drop))
      );
      listeZeichnen();
    }
  });

  form.querySelector("[data-person-add]")?.addEventListener("click", () => {
    leuteVomDom();
    leute.push({ name: "", lohn: "" });
    leuteZeichnen();
    leuteBox?.querySelector("[data-person]:last-child [data-person-name]")?.focus();
  });

  leuteBox?.addEventListener("click", (event) => {
    const ziel = event.target.closest("[data-person-drop]");
    if (!ziel) return;
    leuteVomDom();
    leute.splice(Number(ziel.dataset.personDrop), 1);
    leuteZeichnen();
    zeichnen();
    entwurfSichern();
  });

  leuteBox?.addEventListener("input", () => {
    leuteVomDom();
  });

  form.querySelector("[data-extra-add]")?.addEventListener("click", () => {
    extraVomDom();
    extras.push({ name: "", verkauf: "", kosten: "" });
    extraZeichnen();
    extraBox?.querySelector("[data-extra]:last-child [data-extra-name]")?.focus();
    zeichnen();
    entwurfSichern();
  });

  extraBox?.addEventListener("click", (event) => {
    const ziel = event.target.closest("[data-extra-drop]");
    if (!ziel) return;
    extraVomDom();
    extras.splice(Number(ziel.dataset.extraDrop), 1);
    extraZeichnen();
    syncSonstiges();
    zeichnen();
    entwurfSichern();
  });

  form.querySelector("[data-an-anfrage]")?.addEventListener("click", () => {
    if (anfrageZiel) {
      const eintrag = anfragenLesen().find((item) => schluessel(item) === anfrageZiel && item.art !== "fachkraft");
      if (eintrag) {
        anhaengenAn(eintrag);
        return;
      }
    }
    wahlZeigen();
    if (status) {
      status.textContent = "Wähl die Auftraggeber-Anfrage. Es geht keine E-Mail raus.";
      status.classList.remove("is-error");
    }
  });

  document.querySelector("[data-print]")?.addEventListener("click", () => {
    document.body.classList.remove("druck-angebot");
    window.print();
  });

  document.querySelector("[data-print-kunde]")?.addEventListener("click", () => {
    document.body.classList.add("druck-angebot");
    window.print();
  });

  window.addEventListener("afterprint", () => {
    document.body.classList.remove("druck-angebot");
  });

  zeichnen();
  listeZeichnen();
})();


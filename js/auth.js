const USERS_KEY = "bau-rominia-konten";
const SESSION_KEY = "bau-rominia-session";

const INTERN = {
  dev: ["xxlukexxhdhd@gmail.com"],
  besitzer: ["contact.eurogleis@gmail.com"],
};

const internRolle = (email) => {
  const normalized = String(email || "").trim().toLowerCase();
  if (INTERN.dev.includes(normalized)) return "dev";
  if (INTERN.besitzer.includes(normalized)) return "besitzer";
  return null;
};

const readJson = (key, fallback) => {
  try {
    return JSON.parse(localStorage.getItem(key) || "") ?? fallback;
  } catch {
    return fallback;
  }
};

const PASS_ROUNDS = 12000;
const MIN_PASS = 8;
const SPERRE_KEY = "bau-rominia-sperre";

const altHash = async (password) => {
  const bytes = new TextEncoder().encode(`bau-rominia:${password}`);
  let hash = 2166136261;
  bytes.forEach((part) => {
    hash ^= part;
    hash = Math.imul(hash, 16777619);
  });
  return `lokal-${(hash >>> 0).toString(16)}`;
};

const hashPassword = async (password) => {
  const salt = window.BauSicherheit.zufall(16);
  const hash = await window.BauSicherheit.pbkdf2(password, salt, PASS_ROUNDS, 32);
  return `pbkdf2$${PASS_ROUNDS}$${window.BauSicherheit.b64(salt)}$${window.BauSicherheit.b64(hash)}`;
};

const passwortPasst = async (password, gespeichert) => {
  if (String(gespeichert).startsWith("lokal-")) return (await altHash(password)) === gespeichert;
  const parts = String(gespeichert).split("$");
  if (parts[0] !== "pbkdf2" || parts.length !== 4) return false;
  const salt = window.BauSicherheit.b64decode(parts[2]);
  const hash = await window.BauSicherheit.pbkdf2(password, salt, Number(parts[1]), 32);
  return window.BauSicherheit.gleich(window.BauSicherheit.b64(hash), parts[3]);
};

const sperren = () => {
  try {
    return JSON.parse(sessionStorage.getItem(SPERRE_KEY) || "{}");
  } catch {
    return {};
  }
};

const sperrePruefen = (email) => {
  const eintrag = sperren()[email];
  if (!eintrag || eintrag.bis <= Date.now()) return;
  const minuten = Math.max(1, Math.ceil((eintrag.bis - Date.now()) / 60000));
  throw new Error(`Zu viele Versuche. Bitte ${minuten} Minute warten.`);
};

const sperreMerken = (email, ok) => {
  const stand = sperren();
  if (ok) {
    delete stand[email];
  } else {
    const vorher = stand[email]?.bis > Date.now() ? 5 : stand[email]?.zahl || 0;
    const zahl = vorher + 1;
    stand[email] = zahl >= 5 ? { zahl, bis: Date.now() + 5 * 60 * 1000 } : { zahl, bis: 0 };
  }
  sessionStorage.setItem(SPERRE_KEY, JSON.stringify(stand));
};

let vormerkung = null;

const codePruefen = (user, code) => {
  const sicher = window.BauSicherheit;
  const eingabe = String(code || "").trim();
  if (user.totp && sicher.totpPasst(user.totp, eingabe)) return "app";
  const hashes = Array.isArray(user.codes) ? user.codes : [];
  const hash = sicher.codeHash(eingabe);
  const index = hashes.findIndex((item) => sicher.gleich(item, hash));
  if (index >= 0) return index;
  return null;
};

const users = () => readJson(USERS_KEY, []);

const session = () => readJson(SESSION_KEY, null);

const saveSession = (user) => {
  localStorage.setItem(
    SESSION_KEY,
    JSON.stringify({ name: user.name, email: user.email, rolle: user.rolle, firma: user.firma || "" })
  );
};

const istBesitzer = () => internRolle(session()?.email) !== null;

const istDev = () => internRolle(session()?.email) === "dev";

const paintAccount = () => {
  const current = session();
  document.querySelectorAll("[data-account]").forEach((link) => {
    link.textContent = current?.name || "Anmelden";
    link.href = "konto.html";
  });
  document.querySelectorAll("[data-intern]").forEach((link) => {
    link.hidden = !istBesitzer();
  });
  document.querySelectorAll("[data-dev]").forEach((link) => {
    link.hidden = !istDev();
  });
};

const einrichtenDaten = () => {
  const geheimnis = window.BauSicherheit.neuesGeheimnis();
  const codes = window.BauSicherheit.neueCodes();
  return {
    geheimnis,
    codes: codes.map((item) => item.text),
    codeHashes: codes.map((item) => item.hash),
  };
};

const register = async ({ name, email, password, rolle, firma }) => {
  const normalized = email.trim().toLowerCase();
  const list = users();
  const fest = internRolle(normalized);
  const vorhanden = list.findIndex((user) => user.email === normalized);
  if (vorhanden >= 0 && fest !== "dev") {
    throw new Error("Für diese E-Mail gibt es schon ein Konto.");
  }
  if (rolle === "besitzer" && !fest) {
    throw new Error("Diese E-Mail ist nicht als Besitzer hinterlegt.");
  }
  if (String(password || "").length < MIN_PASS) {
    throw new Error("Das Passwort braucht mindestens 8 Zeichen.");
  }
  const app = einrichtenDaten();
  vormerkung = {
    art: "neu",
    name: name.trim(),
    email: normalized,
    rolle: fest || (rolle === "fachkraft" ? "fachkraft" : "auftrag"),
    firma: (firma || "").trim(),
    password,
    ersetzen: vorhanden >= 0,
    geheimnis: app.geheimnis,
    codeHashes: app.codeHashes,
  };
  return { schritt: "einrichten", email: normalized, geheimnis: app.geheimnis, codes: app.codes };
};

const schreibeRolle = (user) => {
  const fest = internRolle(user.email);
  if (!fest || user.rolle === fest) return;
  user.rolle = fest;
  const list = users();
  const index = list.findIndex((entry) => entry.email === user.email);
  if (index >= 0) {
    list[index].rolle = fest;
    localStorage.setItem(USERS_KEY, JSON.stringify(list));
  }
};

const login = async ({ email, password, code }) => {
  const normalized = email.trim().toLowerCase();
  sperrePruefen(normalized);
  const user = users().find((entry) => entry.email === normalized);
  if (!user || !(await passwortPasst(password, user.pass))) {
    sperreMerken(normalized, false);
    throw new Error("E-Mail oder Passwort stimmt nicht.");
  }
  schreibeRolle(user);
  if (String(user.pass).startsWith("lokal-")) {
    user.pass = await hashPassword(password);
    const list = users();
    const index = list.findIndex((entry) => entry.email === user.email);
    if (index >= 0) {
      list[index].pass = user.pass;
      localStorage.setItem(USERS_KEY, JSON.stringify(list));
    }
  }
  if (!user.totp) {
    const app = einrichtenDaten();
    vormerkung = { art: "bestehend", email: user.email, geheimnis: app.geheimnis, codeHashes: app.codeHashes };
    return { schritt: "einrichten", email: user.email, geheimnis: app.geheimnis, codes: app.codes };
  }
  if (!String(code || "").trim()) return { schritt: "code", email: user.email };
  const treffer = codePruefen(user, code);
  if (treffer === null) {
    sperreMerken(normalized, false);
    throw new Error("Der Code aus der App stimmt nicht.");
  }
  if (treffer !== "app") {
    const list = users();
    const index = list.findIndex((entry) => entry.email === user.email);
    list[index].codes.splice(treffer, 1);
    localStorage.setItem(USERS_KEY, JSON.stringify(list));
  }
  sperreMerken(normalized, true);
  saveSession(user);
  return { fertig: true, user };
};

const einrichtungBestaetigen = async (code) => {
  if (!vormerkung) throw new Error("Die Einrichtung ist abgelaufen. Bitte noch einmal starten.");
  sperrePruefen(vormerkung.email);
  if (!window.BauSicherheit.totpPasst(vormerkung.geheimnis, code)) {
    sperreMerken(vormerkung.email, false);
    throw new Error("Der Code aus der App stimmt nicht. Scanne den Code und versuch es noch einmal.");
  }
  const list = users();
  if (vormerkung.art === "neu") {
    const index = list.findIndex((entry) => entry.email === vormerkung.email);
    if (index >= 0 && !vormerkung.ersetzen) throw new Error("Für diese E-Mail gibt es schon ein Konto.");
    if (index >= 0) list.splice(index, 1);
    const user = {
      name: vormerkung.name,
      email: vormerkung.email,
      rolle: vormerkung.rolle,
      firma: vormerkung.firma,
      seit: new Date().toISOString(),
      pass: await hashPassword(vormerkung.password),
      totp: vormerkung.geheimnis,
      codes: vormerkung.codeHashes,
    };
    list.push(user);
    localStorage.setItem(USERS_KEY, JSON.stringify(list));
    vormerkung = null;
    sperreMerken(user.email, true);
    saveSession(user);
    return user;
  }
  const index = list.findIndex((entry) => entry.email === vormerkung.email);
  if (index < 0) throw new Error("Das Konto liegt in diesem Browser nicht mehr.");
  list[index].totp = vormerkung.geheimnis;
  list[index].codes = vormerkung.codeHashes;
  localStorage.setItem(USERS_KEY, JSON.stringify(list));
  const user = list[index];
  vormerkung = null;
  sperreMerken(user.email, true);
  saveSession(user);
  return user;
};

const resetPassword = async ({ email, password, code }) => {
  const normalized = String(email || "").trim().toLowerCase();
  sperrePruefen(normalized);
  const list = users();
  const index = list.findIndex((entry) => entry.email === normalized);
  if (index < 0) {
    sperreMerken(normalized, false);
    throw new Error("Für diese E-Mail gibt es in diesem Browser kein Konto.");
  }
  if (!list[index].totp) {
    throw new Error("Für dieses Konto ist noch keine App eingerichtet. Erst anmelden, dann die App verbinden.");
  }
  if (String(password || "").length < MIN_PASS) {
    throw new Error("Das Passwort braucht mindestens 8 Zeichen.");
  }
  const treffer = codePruefen(list[index], code);
  if (treffer === null) {
    sperreMerken(normalized, false);
    throw new Error("Der Code aus der App stimmt nicht.");
  }
  if (treffer !== "app") list[index].codes.splice(treffer, 1);
  list[index].pass = await hashPassword(password);
  localStorage.setItem(USERS_KEY, JSON.stringify(list));
  sperreMerken(normalized, true);
};

const passwortSetzen = async ({ email, password, code }) => {
  if (!istDev()) {
    throw new Error("Nur die Entwicklung kann ein fremdes Passwort setzen.");
  }
  await resetPassword({ email, password, code });
};

const logout = () => {
  localStorage.removeItem(SESSION_KEY);
  paintAccount();
};

window.BauRominia = {
  session,
  register,
  login,
  logout,
  resetPassword,
  passwortSetzen,
  einrichtungBestaetigen,
  paintAccount,
  istBesitzer,
  istDev,
};
paintAccount();

const USERS_KEY = "bau-rominia-konten";
const SESSION_KEY = "bau-rominia-session";

const INTERN = {
  dev: ["xxlukexxhdhd@gmail.com"],
  besitzer: [],
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

const hashPassword = async (password) => {
  const bytes = new TextEncoder().encode(`bau-rominia:${password}`);
  let hash = 2166136261;
  bytes.forEach((part) => {
    hash ^= part;
    hash = Math.imul(hash, 16777619);
  });
  return `lokal-${(hash >>> 0).toString(16)}`;
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

const paintAccount = () => {
  const current = session();
  document.querySelectorAll("[data-account]").forEach((link) => {
    link.textContent = current?.name || "Anmelden";
    link.href = "konto.html";
  });
  document.querySelectorAll("[data-intern]").forEach((link) => {
    link.hidden = !istBesitzer();
  });
};

const register = async ({ name, email, password, rolle, firma }) => {
  const normalized = email.trim().toLowerCase();
  const list = users();
  if (list.some((user) => user.email === normalized)) {
    throw new Error("Für diese E-Mail gibt es schon ein Konto.");
  }
  const fest = internRolle(normalized);
  if (rolle === "besitzer" && !fest) {
    throw new Error("Diese E-Mail ist nicht als Besitzer hinterlegt.");
  }
  const user = {
    name: name.trim(),
    email: normalized,
    rolle: fest || (rolle === "fachkraft" ? "fachkraft" : "auftrag"),
    firma: (firma || "").trim(),
    pass: await hashPassword(password),
  };
  list.push(user);
  localStorage.setItem(USERS_KEY, JSON.stringify(list));
  saveSession(user);
  return user;
};

const login = async ({ email, password }) => {
  const normalized = email.trim().toLowerCase();
  const user = users().find((entry) => entry.email === normalized);
  const pass = await hashPassword(password);
  if (!user || user.pass !== pass) {
    throw new Error("E-Mail oder Passwort stimmt nicht.");
  }
  const fest = internRolle(user.email);
  if (fest && user.rolle !== fest) {
    user.rolle = fest;
    const list = users();
    const index = list.findIndex((entry) => entry.email === user.email);
    if (index >= 0) {
      list[index].rolle = fest;
      localStorage.setItem(USERS_KEY, JSON.stringify(list));
    }
  }
  saveSession(user);
  return user;
};

const logout = () => {
  localStorage.removeItem(SESSION_KEY);
  paintAccount();
};

window.BauRominia = { session, register, login, logout, paintAccount, istBesitzer };
paintAccount();

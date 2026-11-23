const USERS_KEY = "bau-rominia-konten";
const SESSION_KEY = "bau-rominia-session";

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

const paintAccount = () => {
  const current = session();
  document.querySelectorAll("[data-account]").forEach((link) => {
    link.textContent = current?.name || "Anmelden";
    link.href = "konto.html";
  });
};

const register = async ({ name, email, password, rolle, firma }) => {
  const normalized = email.trim().toLowerCase();
  const list = users();
  if (list.some((user) => user.email === normalized)) {
    throw new Error("Für diese E-Mail gibt es schon ein Konto.");
  }
  const user = {
    name: name.trim(),
    email: normalized,
    rolle,
    firma: firma.trim(),
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
  saveSession(user);
  return user;
};

const logout = () => {
  localStorage.removeItem(SESSION_KEY);
  paintAccount();
};

window.BauRominia = { session, register, login, logout, paintAccount };
paintAccount();

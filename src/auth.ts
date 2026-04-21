type AuthMode = "login" | "signup";

interface AuthRecord {
  name?: string;
  email: string;
  password: string;
  createdAt: number;
}

const AUTH_STORAGE_KEY = "personal-finance-app.auth-users";
const AUTH_SESSION_KEY = "personal-finance-app.auth-session";

const authTitle = document.querySelector<HTMLHeadingElement>("#authTitle");
const authForm = document.querySelector<HTMLFormElement>("#authForm");
const nameFieldWrap = document.querySelector<HTMLDivElement>("#nameFieldWrap");
const nameField = document.querySelector<HTMLInputElement>("#nameField");
const emailField = document.querySelector<HTMLInputElement>("#emailField");
const passwordField = document.querySelector<HTMLInputElement>("#passwordField");
const passwordToggleButton = document.querySelector<HTMLButtonElement>("#passwordToggleButton");
const passwordHint = document.querySelector<HTMLParagraphElement>("#passwordHint");
const authFeedback = document.querySelector<HTMLParagraphElement>("#authFeedback");
const submitButton = document.querySelector<HTMLButtonElement>("#submitButton");
const switchPrompt = document.querySelector<HTMLParagraphElement>("#switchPrompt");
const switchModeText = document.querySelector<HTMLSpanElement>("#switchModeText");
const switchModeButton = document.querySelector<HTMLButtonElement>("#switchModeButton");

if (
  !authTitle ||
  !authForm ||
  !nameFieldWrap ||
  !nameField ||
  !emailField ||
  !passwordField ||
  !passwordToggleButton ||
  !passwordHint ||
  !authFeedback ||
  !submitButton ||
  !switchPrompt ||
  !switchModeText ||
  !switchModeButton
) {
  throw new Error("Auth page is missing required DOM elements.");
}

const dom = {
  authTitle,
  authForm,
  nameFieldWrap,
  nameField,
  emailField,
  passwordField,
  passwordToggleButton,
  passwordHint,
  authFeedback,
  submitButton,
  switchPrompt,
  switchModeText,
  switchModeButton,
} as const;

let mode: AuthMode = getInitialMode();
const authUsers = loadAuthUsers();

applyMode(mode);

dom.switchModeButton.addEventListener("click", () => {
  mode = mode === "login" ? "signup" : "login";
  applyMode(mode);
});

dom.passwordToggleButton.addEventListener("click", () => {
  const isHidden = dom.passwordField.type === "password";
  dom.passwordField.type = isHidden ? "text" : "password";
  dom.passwordToggleButton.setAttribute("aria-label", isHidden ? "Hide password" : "Show password");
});

dom.authForm.addEventListener("submit", (event) => {
  event.preventDefault();
  dom.authFeedback.textContent = "";

  const name = dom.nameField.value.trim();
  const email = dom.emailField.value.trim().toLowerCase();
  const password = dom.passwordField.value;

  if (mode === "signup" && name.length === 0) {
    dom.authFeedback.textContent = "Name is required.";
    return;
  }

  if (!email.includes("@") || !email.includes(".")) {
    dom.authFeedback.textContent = "Enter a valid email address.";
    return;
  }

  if (password.length < 8) {
    dom.authFeedback.textContent = "Password must be at least 8 characters.";
    return;
  }

  if (mode === "signup") {
    const existingUser = authUsers.find((user) => user.email === email);
    if (existingUser) {
      dom.authFeedback.textContent = "An account with this email already exists.";
      return;
    }

    const newUser: AuthRecord = {
      name,
      email,
      password,
      createdAt: Date.now(),
    };

    authUsers.unshift(newUser);
    saveAuthUsers(authUsers);
    saveSession(email);
    dom.authFeedback.textContent = "Account created successfully.";
    window.location.href = "./index.html";
    return;
  }

  const user = authUsers.find((record) => record.email === email && record.password === password);
  if (!user) {
    dom.authFeedback.textContent = "Incorrect email or password.";
    return;
  }

  saveSession(email);
  dom.authFeedback.textContent = "Login successful.";
  window.location.href = "./index.html";
});

function applyMode(nextMode: AuthMode): void {
  const isSignup = nextMode === "signup";

  dom.authTitle.textContent = isSignup ? "Sign Up" : "Login";
  dom.nameFieldWrap.classList.toggle("hidden", !isSignup);
  dom.nameField.required = isSignup;
  dom.passwordHint.classList.toggle("hidden", !isSignup);
  dom.passwordField.autocomplete = isSignup ? "new-password" : "current-password";

  dom.submitButton.textContent = isSignup ? "Create Account" : "Login";
  dom.switchModeText.textContent = isSignup
    ? "Already have an account?"
    : "Need to create an account?";
  dom.switchModeButton.textContent = isSignup ? "Login" : "Sign Up";

  dom.authForm.reset();
  dom.authFeedback.textContent = "";
  dom.passwordField.type = "password";
  dom.passwordToggleButton.setAttribute("aria-label", "Show password");
}

function getInitialMode(): AuthMode {
  const params = new URLSearchParams(window.location.search);
  const modeValue = params.get("mode");
  return modeValue === "signup" ? "signup" : "login";
}

function loadAuthUsers(): AuthRecord[] {
  const raw = localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(isAuthRecord);
  } catch {
    return [];
  }
}

function saveAuthUsers(items: AuthRecord[]): void {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(items));
}

function saveSession(email: string): void {
  localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify({ email, signedInAt: Date.now() }));
}

function isAuthRecord(value: unknown): value is AuthRecord {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const record = value as Record<string, unknown>;
  return (
    typeof record.email === "string" &&
    typeof record.password === "string" &&
    typeof record.createdAt === "number"
  );
}

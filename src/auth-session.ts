interface AuthSession {
  email: string;
  signedInAt: number;
}

const AUTH_SESSION_KEY = "personal-finance-app.auth-session";

export function requireAuth(): void {
  if (!getAuthSession()) {
    window.location.href = "./auth.html";
  }
}

export function logout(): void {
  localStorage.removeItem(AUTH_SESSION_KEY);
  window.location.href = "./auth.html";
}

export function getAuthSession(): AuthSession | null {
  const raw = localStorage.getItem(AUTH_SESSION_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) {
      return null;
    }

    const session = parsed as Record<string, unknown>;
    if (typeof session.email !== "string" || typeof session.signedInAt !== "number") {
      return null;
    }

    return {
      email: session.email,
      signedInAt: session.signedInAt,
    };
  } catch {
    return null;
  }
}
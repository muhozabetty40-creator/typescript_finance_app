const AUTH_SESSION_KEY = "personal-finance-app.auth-session";
export function requireAuth() {
    if (!getAuthSession()) {
        window.location.href = "./auth.html";
    }
}
export function logout() {
    localStorage.removeItem(AUTH_SESSION_KEY);
    window.location.href = "./auth.html";
}
export function getAuthSession() {
    const raw = localStorage.getItem(AUTH_SESSION_KEY);
    if (!raw) {
        return null;
    }
    try {
        const parsed = JSON.parse(raw);
        if (typeof parsed !== "object" || parsed === null) {
            return null;
        }
        const session = parsed;
        if (typeof session.email !== "string" || typeof session.signedInAt !== "number") {
            return null;
        }
        return {
            email: session.email,
            signedInAt: session.signedInAt,
        };
    }
    catch {
        return null;
    }
}
//# sourceMappingURL=auth-session.js.map
interface AuthSession {
    email: string;
    signedInAt: number;
}
export declare function requireAuth(): void;
export declare function logout(): void;
export declare function getAuthSession(): AuthSession | null;
export {};
//# sourceMappingURL=auth-session.d.ts.map
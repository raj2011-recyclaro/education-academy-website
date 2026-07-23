import { createContext, useContext, useEffect, useState } from "react";
import { GoogleOAuthProvider, googleLogout, useGoogleLogin } from "@react-oauth/google";
import { useNavigate } from "react-router-dom";
import { enrollInCourse, getMe, getMyEnrollments, loginWithGoogleAccessToken, setAuthToken } from "../lib/api";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

const AuthContext = createContext(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}

function roleLandingPath(role) {
  if (role === "admin") return "/admin";
  if (role === "teacher") return "/teacher";
  return "/my-courses";
}

// Session persistence across reloads: the access token itself lives in localStorage and
// is restored + re-validated (via GET /api/auth/me) on every page load. This is a
// deliberate tradeoff, made explicit rather than silent: a token in localStorage is
// readable by injected JS if this site is ever hit by XSS, unlike an httpOnly cookie —
// but it sidesteps every cross-origin/SameSite/third-party-cookie edge case entirely,
// which is what made the earlier cookie-based refresh-token design unreliable in
// practice. The 7-day token lifetime (see server/src/lib/auth.js) is the resulting
// "stay logged in" duration — there is no separate longer-lived refresh token anymore.
const AUTH_TOKEN_KEY = "upskillr_auth_token";

function readStoredToken() {
  try {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  } catch {
    return null;
  }
}

function writeStoredToken(token) {
  try {
    if (token) localStorage.setItem(AUTH_TOKEN_KEY, token);
    else localStorage.removeItem(AUTH_TOKEN_KEY);
  } catch {
    // Storage disabled (e.g. some private-browsing modes) — session just won't survive
    // a reload in that case, same as before this mechanism existed.
  }
}

function AuthContextProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(() => Boolean(readStoredToken()));

  useEffect(() => {
    const storedToken = readStoredToken();
    if (!storedToken) {
      setLoading(false);
      return undefined;
    }
    let active = true;
    setAuthToken(storedToken);
    getMe()
      .then((restoredUser) => {
        if (active) setUser(restoredUser);
      })
      .catch(() => {
        // Token expired/invalid — clear it rather than keep retrying every load.
        writeStoredToken(null);
        setAuthToken(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  // Used by the custom "Login" button (real popup, useGoogleLogin) — see LoginButton below.
  const applyAccessTokenSession = async (accessToken) => {
    const { token, user: loggedInUser } = await loginWithGoogleAccessToken(accessToken);
    setAuthToken(token);
    writeStoredToken(token);
    setUser(loggedInUser);
    return loggedInUser;
  };

  const logout = () => {
    googleLogout();
    writeStoredToken(null);
    setAuthToken(null);
    setUser(null);
  };

  const refresh = async () => {
    try {
      const fresh = await getMe();
      setUser(fresh);
    } catch {
      writeStoredToken(null);
      setAuthToken(null);
      setUser(null);
    }
  };

  const value = { user, role: user?.role ?? null, loading, applyAccessTokenSession, logout, refresh };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function AuthProvider({ children }) {
  if (!GOOGLE_CLIENT_ID) {
    return <AuthContextProvider>{children}</AuthContextProvider>;
  }
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AuthContextProvider>{children}</AuthContextProvider>
    </GoogleOAuthProvider>
  );
}

// Custom-styled button that opens Google's real sign-in popup (not Google's own
// rendered button/iframe). Uses the OAuth access-token flow (useGoogleLogin), the only
// way to trigger Google's popup from an arbitrary custom-styled button.
function LoginButtonInner({ label, className, redirectAfterLogin, onSuccess }) {
  const { applyAccessTokenSession } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const openGooglePopup = useGoogleLogin({
    scope: "openid email profile",
    onSuccess: async (tokenResponse) => {
      setError("");
      if (!tokenResponse?.access_token) {
        setError("Google didn't return a valid session. Please try again.");
        return;
      }
      setBusy(true);
      try {
        const loggedInUser = await applyAccessTokenSession(tokenResponse.access_token);
        if (redirectAfterLogin) navigate(roleLandingPath(loggedInUser.role));
        onSuccess?.(loggedInUser);
      } catch {
        setError("Sign-in failed. Please try again.");
      } finally {
        setBusy(false);
      }
    },
    onError: () => setError("Sign-in failed. Please try again."),
  });

  return (
    <div className="login-button-wrap">
      <button type="button" className={className} onClick={() => openGooglePopup()} disabled={busy}>
        {busy ? "Signing in…" : label}
      </button>
      {error && <p className="form-error">{error}</p>}
    </div>
  );
}

export function LoginButton({ label = "Login", className = "button small", redirectAfterLogin = false, onSuccess }) {
  if (!GOOGLE_CLIENT_ID) {
    return <span className="auth-disabled-note">Google sign-in isn't configured yet.</span>;
  }
  return <LoginButtonInner label={label} className={className} redirectAfterLogin={redirectAfterLogin} onSuccess={onSuccess} />;
}

function SignInPrompt() {
  return (
    <div className="auth-signin-prompt">
      <p>Sign in with Google to continue.</p>
      <LoginButton label="Sign in with Google" className="button" />
    </div>
  );
}

export function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="auth-loading">Loading your session…</div>;
  if (!user) return <SignInPrompt />;
  return children;
}

export function RequireRole({ roles, children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="auth-loading">Loading your session…</div>;
  if (!user) return <SignInPrompt />;
  // Admin implicitly passes every role check — see docs/PLATFORM_AUTH_RBAC_PRD.md §8.2.
  if (user.role !== "admin" && !roles.includes(user.role)) {
    return <div className="auth-forbidden">You don't have access to this page.</div>;
  }
  return children;
}

export function EnrollButton({ courseType, courseSlug }) {
  const { user } = useAuth();
  const [status, setStatus] = useState("checking");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!user) {
      setStatus("not-enrolled");
      return undefined;
    }
    let active = true;
    setStatus("checking");
    getMyEnrollments()
      .then((enrollments) => {
        if (!active) return;
        const match = enrollments.some((item) => item.courseType === courseType && item.courseSlug === courseSlug);
        setStatus(match ? "enrolled" : "not-enrolled");
      })
      .catch(() => {
        if (active) setStatus("not-enrolled");
      });
    return () => {
      active = false;
    };
  }, [user, courseType, courseSlug]);

  if (!user) {
    return (
      <div className="enroll-panel">
        <p>Sign in to opt into this course.</p>
        <LoginButton label="Sign in with Google" className="button" />
      </div>
    );
  }

  const enroll = async () => {
    setMessage("");
    setStatus("checking");
    try {
      await enrollInCourse({ courseType, courseSlug });
      setStatus("enrolled");
    } catch (error) {
      setMessage(error.message || "Could not enroll right now.");
      setStatus("not-enrolled");
    }
  };

  if (status === "checking") {
    return <button className="button secondary" type="button" disabled>Checking…</button>;
  }

  if (status === "enrolled") {
    return <button className="button secondary" type="button" disabled>✓ You're enrolled</button>;
  }

  return (
    <div className="enroll-panel">
      <button className="button" type="button" onClick={enroll}>Opt into this course</button>
      {message && <p className="form-error">{message}</p>}
    </div>
  );
}

import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";

let googleClient = null;

function getGoogleClient() {
  if (!process.env.GOOGLE_CLIENT_ID) {
    throw new Error("GOOGLE_CLIENT_ID is not configured");
  }
  if (!googleClient) {
    googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
  }
  return googleClient;
}

// Verifies signature, audience, issuer, and expiry against Google's public keys.
// Never trust a client-decoded token payload.
export async function verifyGoogleIdToken(idToken) {
  const client = getGoogleClient();
  const ticket = await client.verifyIdToken({
    idToken,
    audience: process.env.GOOGLE_CLIENT_ID,
  });
  const payload = ticket.getPayload();
  if (!payload?.sub || !payload?.email) {
    throw new Error("Google token payload is missing required fields");
  }
  return {
    sub: payload.sub,
    email: payload.email,
    emailVerified: payload.email_verified === true,
    fullName: payload.name || "",
    avatarUrl: payload.picture || null,
  };
}

// Used for the custom "Login" button popup flow (useGoogleLogin), which returns an
// OAuth access token rather than an ID token. No client secret is needed here either —
// tokeninfo/userinfo are both publicly callable with a valid bearer token. The audience
// check on tokeninfo is what stops a token minted for a *different* app being replayed
// here; without it we'd trust any Google-issued token regardless of which app the user
// actually consented to.
export async function verifyGoogleAccessToken(accessToken) {
  const tokenInfoResponse = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(accessToken)}`,
  );
  if (!tokenInfoResponse.ok) {
    throw new Error("Could not verify Google access token");
  }
  const tokenInfo = await tokenInfoResponse.json();
  if (tokenInfo.aud !== process.env.GOOGLE_CLIENT_ID) {
    throw new Error("Access token was not issued for this application");
  }

  const userInfoResponse = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!userInfoResponse.ok) {
    throw new Error("Could not fetch Google profile");
  }
  const payload = await userInfoResponse.json();
  if (!payload.sub || !payload.email) {
    throw new Error("Google userinfo response is missing required fields");
  }
  return {
    sub: payload.sub,
    email: payload.email,
    emailVerified: payload.email_verified === true || payload.email_verified === "true",
    fullName: payload.name || "",
    avatarUrl: payload.picture || null,
  };
}

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not configured");
  }
  return secret;
}

// 7 days: the token itself lives in the client's localStorage (see
// docs/PLATFORM_AUTH_RBAC_PRD.md §9.2 addendum) and is the sole session artifact — no
// separate refresh token — so its lifetime IS the "stay logged in" duration.
export function signAppToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role, email: user.email },
    getJwtSecret(),
    { algorithm: "HS256", expiresIn: "7d" },
  );
}

function verifyAppToken(token) {
  // Pin the algorithm explicitly — never let the library infer it from the token.
  return jwt.verify(token, getJwtSecret(), { algorithms: ["HS256"] });
}

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) {
    res.status(401).json({ error: "Unauthorized", message: "Missing or malformed Authorization header" });
    return;
  }
  try {
    const decoded = verifyAppToken(token);
    req.user = { id: decoded.sub, role: decoded.role, email: decoded.email };
    next();
  } catch {
    res.status(401).json({ error: "Unauthorized", message: "Invalid or expired session" });
  }
}

// Admin implicitly passes every role check — admin has full access everywhere.
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized", message: "Missing or malformed Authorization header" });
      return;
    }
    if (req.user.role === "admin" || roles.includes(req.user.role)) {
      next();
      return;
    }
    res.status(403).json({ error: "Forbidden", message: "You do not have access to this resource" });
  };
}

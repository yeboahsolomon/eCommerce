import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

// ─────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────

/** Routes under /admin that do NOT require authentication */
const ADMIN_PUBLIC_PATHS = new Set(['/admin/login', '/admin/register']);

/** Cookie name that holds the access-token JWT (set by the backend) */
const ADMIN_TOKEN_COOKIE = 'admin_token';

// ─────────────────────────────────────────────────────────────
// JWT helpers (Edge-compatible via `jose`)
// ─────────────────────────────────────────────────────────────

interface AdminJwtPayload {
  adminId: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

/**
 * Lazily encode the JWT secret once so it can be reused across requests
 * within the same Edge isolate lifetime.
 */
let _secret: Uint8Array | null = null;

function getSecret(): Uint8Array {
  if (_secret) return _secret;

  const raw = process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET;
  if (!raw) {
    throw new Error('[middleware] ADMIN_JWT_SECRET environment variable is not set.');
  }
  _secret = new TextEncoder().encode(raw);
  return _secret;
}

/**
 * Verify the JWT and return its typed payload, or `null` when invalid / expired.
 */
async function verifyToken(token: string): Promise<AdminJwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as unknown as AdminJwtPayload;
  } catch {
    // Token expired, malformed, wrong signature, etc.
    return null;
  }
}

// ─────────────────────────────────────────────────────────────
// Middleware
// ─────────────────────────────────────────────────────────────

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── Skip public admin pages (login / register) ────────────
  if (ADMIN_PUBLIC_PATHS.has(pathname)) {
    // If the user is already authenticated as admin and tries to visit
    // /admin/login, redirect them to the dashboard instead.
    const token = request.cookies.get(ADMIN_TOKEN_COOKIE)?.value;
    if (token) {
      const payload = await verifyToken(token);
      if (payload?.role === 'superadmin') {
        return NextResponse.redirect(new URL('/admin', request.url));
      }
    }
    return NextResponse.next();
  }

  // ── Protect every other /admin/* route ────────────────────
  const token = request.cookies.get(ADMIN_TOKEN_COOKIE)?.value;

  if (!token) {
    return redirectToLogin(request, 'Please sign in to access the admin panel.');
  }

  const payload = await verifyToken(token);

  if (!payload) {
    // Token exists but is invalid or expired — clear it and redirect
    const response = redirectToLogin(request, 'Your session has expired. Please sign in again.');
    response.cookies.delete(ADMIN_TOKEN_COOKIE);
    return response;
  }

  if (payload.role !== 'superadmin') {
    return redirectToLogin(request, 'Access denied. Admin privileges required.');
  }

  // ── Authorized — continue to the admin page ───────────────
  return NextResponse.next();
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

/**
 * Build a redirect response to the admin login page with an error message
 * passed as a query parameter so the login UI can display it.
 */
function redirectToLogin(request: NextRequest, message: string): NextResponse {
  const loginUrl = new URL('/admin/login', request.url);
  loginUrl.searchParams.set('error', message);
  return NextResponse.redirect(loginUrl);
}

// ─────────────────────────────────────────────────────────────
// Matcher — only run this middleware for admin routes
// ─────────────────────────────────────────────────────────────

export const config = {
  matcher: ['/admin/:path*'],
};

import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

// ─────────────────────────────────────────────────────────────
// ADMIN MIDDLEWARE — Completely independent from storefront
//
// This middleware ONLY handles /admin/* routes.
// It does NOT read, write, or validate storefront tokens.
// Storefront auth is handled entirely by client-side Firebase.
// ─────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────

/** Routes under /admin that do NOT require authentication */
const ADMIN_PUBLIC_PATHS = new Set(['/admin/login', '/admin/register']);

/** Cookie name that holds the admin access-token JWT (set by the backend) */
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
 * Verify the admin JWT and return its typed payload, or `null` when
 * the token is invalid, expired, or has a wrong signature.
 *
 * @param token  The raw JWT string from the `admin_token` cookie.
 * @returns      The decoded payload, or `null` on failure.
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

/**
 * Next.js Edge Middleware for admin route protection.
 *
 * **Behaviour:**
 * - For `/admin/login` (and `/admin/register`):
 *   - If a valid `admin_token` cookie exists → redirect to `/admin/dashboard`
 *   - Otherwise → allow access (public page)
 *
 * - For all other `/admin/*` routes:
 *   - If no `admin_token` cookie → redirect to `/admin/login`
 *   - If the token is invalid/expired → clear cookie, redirect to `/admin/login`
 *   - If the token role ≠ `superadmin` → redirect to `/admin/login`
 *   - Otherwise → allow access
 *
 * **Isolation:**
 * - This middleware completely ignores storefront tokens.
 * - Storefront routes completely ignore `admin_token`.
 */
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
        return NextResponse.redirect(new URL('/admin/dashboard', request.url));
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
//
// Storefront routes are NOT matched here and are therefore
// completely unaffected by this middleware. This ensures
// full isolation between admin and storefront auth systems.
// ─────────────────────────────────────────────────────────────

export const config = {
  matcher: ['/admin/:path*'],
};

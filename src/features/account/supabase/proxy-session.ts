import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseEnv } from "./env";

export async function updateSupabaseSession(
  request: NextRequest,
): Promise<NextResponse> {
  let response = NextResponse.next({ request });
  const { url, anonKey } = getSupabaseEnv();
  const authCookieName = getSupabaseAuthCookieName(url);

  if (!hasSupabaseAuthTokenCookie(request, authCookieName)) {
    return response;
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // Touch the user to trigger token refresh + Set-Cookie.
  try {
    const { error } = await supabase.auth.getUser();
    if (isMissingRefreshTokenError(error)) {
      expireSupabaseAuthCookies(request, response, authCookieName);
    }
  } catch (error) {
    if (!isMissingRefreshTokenError(error)) {
      throw error;
    }
    expireSupabaseAuthCookies(request, response, authCookieName);
  }

  return response;
}

function getSupabaseAuthCookieName(url: string) {
  const projectRef = new URL(url).hostname.split(".")[0];
  return `sb-${projectRef}-auth-token`;
}

function isMissingRefreshTokenError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "refresh_token_not_found"
  );
}

function isCookieChunkForKey(name: string, key: string) {
  if (name === key) return true;
  if (!name.startsWith(`${key}.`)) return false;

  const chunkIndex = name.slice(key.length + 1);
  return /^(0|[1-9][0-9]*)$/.test(chunkIndex);
}

function hasSupabaseAuthTokenCookie(
  request: NextRequest,
  authCookieName: string,
) {
  return request.cookies
    .getAll()
    .some(({ name }) => isCookieChunkForKey(name, authCookieName));
}

function expireSupabaseAuthCookies(
  request: NextRequest,
  response: NextResponse,
  authCookieName: string,
) {
  const authCookieKeys = [
    authCookieName,
    `${authCookieName}-code-verifier`,
    `${authCookieName}-user`,
  ];
  const cookieNamesToExpire = request.cookies
    .getAll()
    .map(({ name }) => name)
    .filter((name) =>
      authCookieKeys.some((key) => isCookieChunkForKey(name, key)),
    );

  for (const name of cookieNamesToExpire) {
    request.cookies.delete(name);
    response.cookies.set(name, "", {
      path: "/",
      sameSite: "lax",
      maxAge: 0,
    });
  }

  if (cookieNamesToExpire.length > 0) {
    response.headers.set(
      "Cache-Control",
      "private, no-cache, no-store, must-revalidate, max-age=0",
    );
    response.headers.set("Expires", "0");
    response.headers.set("Pragma", "no-cache");
  }
}

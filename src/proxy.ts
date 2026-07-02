import { NextResponse, type NextRequest } from "next/server";
import {
  defaultLocale,
  isLocale,
  localeCookieName,
  supportedLocales,
} from "./i18n/config";
import { updateSupabaseSession } from "./features/account/supabase/proxy-session";

function pathnameHasLocale(pathname: string) {
  return supportedLocales.some(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`),
  );
}

function getPreferredLocale(request: NextRequest) {
  const cookieLocale = request.cookies.get(localeCookieName)?.value;
  return isLocale(cookieLocale) ? cookieLocale : defaultLocale;
}

function getPathPartsAfterOptionalLocale(pathname: string) {
  const parts = pathname.split("/").filter(Boolean);
  return parts.length > 0 && isLocale(parts[0]) ? parts.slice(1) : parts;
}

function isAuthEntryPath(pathname: string) {
  const parts = getPathPartsAfterOptionalLocale(pathname);

  if (parts.length === 1) {
    return parts[0] === "login";
  }

  return parts.length === 2 && parts[0] === "auth" && parts[1] === "callback";
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionResponse = isAuthEntryPath(pathname)
    ? NextResponse.next({ request })
    : await updateSupabaseSession(request);

  if (pathnameHasLocale(pathname)) {
    return sessionResponse;
  }

  const locale = getPreferredLocale(request);
  const url = request.nextUrl.clone();
  url.pathname = pathname === "/" ? `/${locale}` : `/${locale}${pathname}`;

  const redirect = NextResponse.redirect(url);
  for (const cookie of sessionResponse.cookies.getAll()) {
    redirect.cookies.set(cookie);
  }
  return redirect;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\..*).*)",
  ],
};

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_API_ROUTES = ["/api/auth/login", "/api/auth/logout"];
const PUBLIC_PAGES = ["/login", "/trocar-senha"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isApiRoute = pathname.startsWith("/api/");
  const isPublicApi = PUBLIC_API_ROUTES.some((r) => pathname.startsWith(r));
  const isPublicPage = PUBLIC_PAGES.some((r) => pathname === r);

  if (isApiRoute && !isPublicApi) {
    const session = request.cookies.get("brinquedoteca_session");
    if (!session?.value) {
      return NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 }
      );
    }
  }

  if (!isApiRoute && !isPublicPage) {
    const session = request.cookies.get("brinquedoteca_session");
    if (!session?.value) {
      const loginUrl = new URL("/login", request.url);
      if (pathname !== "/") {
        loginUrl.searchParams.set("redirect", pathname);
      }
      return NextResponse.redirect(loginUrl);
    }
  }

  const response = NextResponse.next();

  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|public/).*)",
  ],
};

import { NextRequest, NextResponse } from "next/server";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const WEBHOOK_PATH =
  /^\/api\/integrations\/pos\/[^/]+\/webhook\/?$/;

function expectedOrigin(request: NextRequest): string {
  if (process.env.NODE_ENV !== "production") {
    return request.nextUrl.origin;
  }
  const configured = process.env.APP_BASE_URL;
  if (!configured) return request.nextUrl.origin;
  try {
    return new URL(configured).origin;
  } catch {
    return request.nextUrl.origin;
  }
}

export function proxy(request: NextRequest) {
  if (SAFE_METHODS.has(request.method) || WEBHOOK_PATH.test(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite === "cross-site" || fetchSite === "same-site") {
    return NextResponse.json(
      { error: "Cross-origin mutation blocked." },
      { status: 403, headers: { "Cache-Control": "no-store" } },
    );
  }

  const origin = request.headers.get("origin");
  if (origin && origin !== expectedOrigin(request)) {
    return NextResponse.json(
      { error: "Request origin is not allowed." },
      { status: 403, headers: { "Cache-Control": "no-store" } },
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};

import { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export const config = {
  matcher: ["/", "/main"],
};

export function middleware(request: NextRequest) {
  // Setting cookies on the response
  const response = NextResponse.next();

  return response;
}

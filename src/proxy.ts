import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/industry-login", "/auth/callback"];

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isPublicPath = PUBLIC_PATHS.some((p) => path.startsWith(p));

  if (!user && !isPublicPath) {
    // Links we email to professionals point at /mentor/*, so send them to their
    // own sign-in page rather than the campus one that demands an SRM address.
    const loginPath = path.startsWith("/mentor") ? "/industry-login" : "/login";
    return NextResponse.redirect(new URL(loginPath, request.url));
  }

  if (user && path.startsWith("/auth")) return response;

  if (user) {
    // Industry professionals live under /mentor; campus users everywhere else.
    // RLS hides `profiles` from industry accounts, so an empty result identifies them.
    const { data: campus } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    if (!campus && !path.startsWith("/mentor")) {
      return NextResponse.redirect(new URL("/mentor", request.url));
    }
    if (campus && (path.startsWith("/mentor") || path === "/login" || path === "/industry-login")) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};

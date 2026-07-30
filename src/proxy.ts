import { type NextRequest, NextResponse } from "next/server";

// Next.js 16 renombró middleware.ts a proxy.ts (exporta `proxy`, no `middleware`) — verificado
// contra la documentación del track. **Debe vivir en src/, no en la raíz del proyecto**, porque
// este scaffold usa --src-dir — verificado en vivo: en la raíz nunca se compiló ni se invocó
// (ninguna línea de log lo mencionaba); movido a src/proxy.ts, el log mostró
// "proxy.ts: 218ms" en cada request y el header sí llegó. Este proxy NO autoriza nada — solo expone la ruta actual en
// un header para que requireUser()/requireAdmin() puedan construir el redirect "?next=" desde un
// Server Component, que no tiene acceso directo al pathname de la request. La autorización real
// vive en cada Server Component/Action, nunca aquí (blueprint.md §8, "Enforcement rule").
export function proxy(request: NextRequest) {
  // Debe ir en los headers de la REQUEST reenviada, no en los de la respuesta — headers() en un
  // Server Component lee los headers de la request entrante, no los que el proxy le pondría a la
  // respuesta del cliente (verificado contra la documentación de Next.js sobre este patrón).
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", request.nextUrl.pathname);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

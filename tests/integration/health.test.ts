import * as Sentry from "@sentry/nextjs";
import { describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/health/route";

// `vi.spyOn` no puede redefinir un export de un módulo ESM real (binding no configurable) —
// mockear el módulo completo es el único mecanismo que Vitest soporta aquí.
vi.mock("@sentry/nextjs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@sentry/nextjs")>();
  return { ...actual, captureException: vi.fn(() => "mocked-event-id") };
});

describe("health", () => {
  it("responds 200 with the current migration state when the database is reachable", async () => {
    const response = await GET(new Request("http://localhost/api/health"));
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.status).toBe("ok");
    expect(body.migration).not.toBeNull();
    expect(typeof body.migration.id).toBe("number");
    expect(typeof body.migration.hash).toBe("string");
  });

  it("reports a deliberate error to Sentry with a request_id correlatable in the logs and the response", async () => {
    const captureSpy = vi.mocked(Sentry.captureException);
    captureSpy.mockClear();
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await GET(
      new Request("http://localhost/api/health?fail=1"),
    );
    expect(response.status).toBe(500);

    const body = await response.json();
    expect(typeof body.request_id).toBe("string");

    expect(captureSpy).toHaveBeenCalledTimes(1);
    const [, captureOptions] = captureSpy.mock.calls[0];
    expect(captureOptions).toEqual({
      tags: { request_id: body.request_id },
    });

    expect(consoleSpy).toHaveBeenCalledTimes(1);
    const loggedLine = consoleSpy.mock.calls[0][0] as string;
    const logged = JSON.parse(loggedLine);
    expect(logged.request_id).toBe(body.request_id);

    consoleSpy.mockRestore();
  });
});

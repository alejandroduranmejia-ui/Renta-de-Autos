import { expect, test } from "@playwright/test";

test.describe("shell viewport", () => {
  for (const width of [375, 1440]) {
    test(`marketing layout has no horizontal scroll at ${width}px`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto("/");
      const noHorizontalScroll = await page.evaluate(
        () =>
          document.documentElement.scrollWidth ===
          document.documentElement.clientWidth,
      );
      expect(noHorizontalScroll).toBe(true);
    });
  }

  test("the root layout has the dark class in the first server response, before hydration", async ({
    request,
  }) => {
    // La cookie de tema se lee en src/app/layout.tsx, la raíz que envuelve tanto (marketing)
    // como (app) — probarlo contra "/" (siempre público) evita que el paso 4 (auth en (app))
    // rompa este gate más adelante (blueprint.md §9, regla 9).
    const response = await request.get("/", {
      headers: { Cookie: "theme=dark" },
    });
    const html = await response.text();
    expect(html).toMatch(/<html[^>]*\bclass="[^"]*\bdark\b/);
  });
});

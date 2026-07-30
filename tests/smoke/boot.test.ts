import { describe, expect, it } from "vitest";
import { env } from "@/lib/env";

describe("env", () => {
  it("parses without throwing when the minimal variables are present", () => {
    expect(env).toBeDefined();
  });
});

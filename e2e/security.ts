import fs from "node:fs";
import { randomUUID } from "node:crypto";

const envFile = fs.existsSync(".env.local")
  ? fs.readFileSync(".env.local", "utf8")
  : "";

/** Reads local test configuration without ever printing its value. */
export function env(name: string): string {
  const fromFile = envFile.match(new RegExp(`^${name}=(.*)$`, "m"))?.[1];
  const value = process.env[name] ?? fromFile;
  if (!value) throw new Error(`Missing env: ${name}`);
  return value;
}

/** A run-specific suffix prevents cleanup from touching another test run's data. */
export const runId = (process.env.E2E_RUN_ID ?? randomUUID()).replace(/[^a-z0-9-]/gi, "");

export function testEmail(prefix: string): string {
  return `${prefix}-${runId}@example.invalid`;
}

/**
 * Tests that use the Supabase admin key, flood endpoints, or create payments
 * must be deliberately enabled. Remote targets require a second acknowledgement.
 */
export function assertSafeE2ETarget(): void {
  if (process.env.E2E_TEST_MODE !== "1") {
    throw new Error("Refusing side-effecting E2E test. Set E2E_TEST_MODE=1 explicitly.");
  }

  const hostname = new URL(env("NEXT_PUBLIC_SUPABASE_URL")).hostname;
  const localTarget = hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
  if (!localTarget && process.env.E2E_ALLOW_REMOTE !== "1") {
    throw new Error(
      `Refusing to use admin credentials against remote host ${hostname}. ` +
        "Set E2E_ALLOW_REMOTE=1 only for an isolated test project.",
    );
  }
}

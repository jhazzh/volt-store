"use client";

import { useActionState } from "react";
import { updatePassword, type PasswordState } from "@/app/account/actions";

/**
 * @return {JSX.Element} change-password form
 */
export function PasswordForm() {
  const [state, formAction, pending] = useActionState<PasswordState, FormData>(
    updatePassword,
    {}
  );

  return (
    <form action={formAction} className="space-y-3">
      <div>
        <label htmlFor="password" className="mb-1 block text-sm text-muted">
          New password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        />
      </div>
      {state.error && (
        <p role="alert" className="text-sm text-red-500">
          {state.error}
        </p>
      )}
      {state.success && (
        <p role="status" className="text-sm text-green-500">
          Password updated.
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "Please wait…" : "Update password"}
      </button>
    </form>
  );
}

"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { AuthState } from "@/app/(auth)/actions";

type Props = {
  title: string;
  action: (prev: AuthState, formData: FormData) => Promise<AuthState>;
  altHref: string;
  altLabel: string;
};

/**
 * @param {Props} props form config
 * @return {JSX.Element} login/signup form
 */
export function AuthForm({ title, action, altHref, altLabel }: Props) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <h1 className="text-2xl font-bold">{title}</h1>
      <form action={formAction} className="mt-6 space-y-4">
        <div>
          <label htmlFor="email" className="mb-1 block text-sm text-muted">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label htmlFor="password" className="mb-1 block text-sm text-muted">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="current-password"
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
        </div>
        {state.error && (
          <p role="alert" className="text-sm text-red-500">
            {state.error}
          </p>
        )}
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-lg bg-accent py-2.5 text-sm font-semibold text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "Please wait…" : title}
        </button>
      </form>
      <p className="mt-4 text-sm text-muted">
        <Link href={altHref} className="underline hover:text-accent">
          {altLabel}
        </Link>
      </p>
    </div>
  );
}

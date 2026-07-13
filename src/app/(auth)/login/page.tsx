import type { Metadata } from "next";
import { AuthForm } from "@/components/auth-form";
import { login } from "../actions";

export const metadata: Metadata = { title: "Log in" };

export default function LoginPage() {
  return (
    <AuthForm
      title="Log in"
      action={login}
      altHref="/signup"
      altLabel="No account? Sign up"
    />
  );
}

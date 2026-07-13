import type { Metadata } from "next";
import { AuthForm } from "@/components/auth-form";
import { signup } from "../actions";

export const metadata: Metadata = { title: "Sign up" };

export default function SignupPage() {
  return (
    <AuthForm
      title="Sign up"
      action={signup}
      altHref="/login"
      altLabel="Have an account? Log in"
    />
  );
}

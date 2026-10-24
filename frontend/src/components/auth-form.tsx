"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { z } from "zod";
import { ApiError, errorMessage } from "@/lib/api";
import { useAction } from "@/lib/hooks";
import { Logo } from "./brand";
import { useSession } from "./session";
import { ThemeToggle } from "./theme";
import { Button, Field, Glass, Input, Notice, PasswordInput } from "./ui";

const schemas = {
  login: z.object({
    email: z.email("Enter a valid email address."),
    password: z.string().min(1, "Enter your password."),
    name: z.string().optional(),
  }),
  signup: z.object({
    name: z.string().trim().min(1, "Tell us your name.").max(120),
    email: z.email("Enter a valid email address."),
    password: z.string().min(8, "Use at least 8 characters.").max(200),
  }),
};

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const { login, register } = useSession();
  const router = useRouter();
  const [values, setValues] = useState({ name: "", email: "", password: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const submit = useAction(async () => {
    const parsed = schemas[mode].safeParse(values);
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])));
      return;
    }
    setErrors({});
    setFormError(null);
    try {
      if (mode === "login") await login(values.email, values.password);
      else await register(values.email, values.name, values.password);
      router.replace(mode === "signup" ? "/onboarding" : "/w");
    } catch (e) {
      if (e instanceof ApiError && e.fields) setErrors(e.fields);
      setFormError(errorMessage(e));
    }
  });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void submit.run();
  };
  const set = (k: keyof typeof values) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setValues((v) => ({ ...v, [k]: e.target.value }));

  return (
    <main className="dot-field flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div className="mb-8 flex w-full max-w-sm items-center justify-between">
        <Logo />
        <ThemeToggle />
      </div>
      <Glass className="enter-rise w-full max-w-sm p-7 sm:p-8">
        <h1 className="font-display text-2xl font-bold tracking-tight">{mode === "login" ? "Welcome back" : "Create your account"}</h1>
        <p className="mt-1.5 text-sm text-ink-2">
          {mode === "login" ? "Sign in to pick up where you left off." : "Your workspace for company research, customer experiments and clearer decisions."}
        </p>
        {mode === "signup" && (
          <div className="mt-5 rounded-xl border border-line bg-surface p-4">
            <p className="text-sm font-semibold text-ink">Start with a question. Build a clearer plan.</p>
            <p className="mt-1 text-sm leading-relaxed text-ink-2">Full reports, follow-up questions and all six experiment workflows. No payment details needed.</p>
            <p className="mt-2 text-xs text-ink-3">Fair-use limits and research availability apply.</p>
          </div>
        )}
        <form onSubmit={onSubmit} noValidate className="mt-6 space-y-4">
          {formError && <Notice tone="bad">{formError}</Notice>}
          {mode === "signup" && (
            <Field label="Name" error={errors.name}>
              {(id, d) => <Input id={id} aria-describedby={d} aria-invalid={!!errors.name} autoComplete="name" value={values.name} onChange={set("name")} />}
            </Field>
          )}
          <Field label="Work email" error={errors.email}>
            {(id, d) => <Input id={id} type="email" aria-describedby={d} aria-invalid={!!errors.email} autoComplete="email" value={values.email} onChange={set("email")} />}
          </Field>
          <Field label="Password" error={errors.password} hint={mode === "signup" ? "At least 8 characters." : undefined}>
            {(id, d) => (
              <PasswordInput id={id} aria-describedby={d} aria-invalid={!!errors.password}
                minLength={mode === "signup" ? 8 : undefined} maxLength={200}
                autoComplete={mode === "login" ? "current-password" : "new-password"} value={values.password} onChange={set("password")} />
            )}
          </Field>
          <Button type="submit" size="lg" className="shimmer-btn w-full" loading={submit.pending}>
            {mode === "login" ? "Sign in" : "Create account"}
          </Button>
        </form>
      </Glass>
      <p className="mt-6 text-sm text-ink-2">
        {mode === "login" ? (
          <>New to Pursuit? <Link href="/signup" className="font-semibold text-trail hover:underline">Create an account</Link></>
        ) : (
          <>Already have an account? <Link href="/login" className="font-semibold text-trail hover:underline">Sign in</Link></>
        )}
      </p>
    </main>
  );
}

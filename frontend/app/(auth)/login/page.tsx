"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  ArrowRight,
  Clock,
  Eye,
  EyeOff,
  Lock,
  Mail,
  ShieldCheck,
  Users,
} from "lucide-react";


import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/layout/Logo";
import { useAuth } from "@/hooks/useAuth";
import { friendlyError } from "@/lib/axios";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});
type LoginValues = z.infer<typeof loginSchema>;

const features = [
  { icon: Users,      label: "Multi-tenant workspaces" },
  { icon: Clock,      label: "Automated renewal reminders" },
  { icon: ShieldCheck, label: "Full audit trails" },
];

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { login } = useAuth();
  const [showPwd, setShowPwd] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: LoginValues) {
    setSubmitting(true);
    try {
      await login(values.email, values.password);
      const redirect = params.get("from") ?? "/dashboard";
      router.replace(redirect);
    } catch (err) {
      toast.error(friendlyError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid w-full max-w-5xl gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-16 animate-fade-in">
      {/* Marketing panel */}
      <div className="hidden flex-col justify-between rounded-3xl border border-border bg-card/50 p-10 lg:flex">
        <Logo />

        <div className="space-y-8">
          <h1 className="font-display text-3xl font-semibold leading-snug tracking-tight text-balance">
            Billing & payments,{" "}
            <span className="bg-gradient-to-br from-primary via-violet-500 to-indigo-400 bg-clip-text text-transparent">
              without the spreadsheets.
            </span>
          </h1>

          <ul className="space-y-3">
            {features.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                <Icon className="h-4 w-4 shrink-0 text-primary" />
                {label}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-muted-foreground/60">
          © {new Date().getFullYear()} PayNest
        </p>
      </div>

      {/* Form panel */}
      <div className="flex flex-col justify-center">
        <div className="mx-auto w-full max-w-md space-y-8 rounded-3xl border border-border bg-card p-8 shadow-pop sm:p-10">
          {/* Mobile logo */}
          <div className="lg:hidden">
            <Logo />
          </div>

          <div className="space-y-1.5">
            <h2 className="font-display text-2xl font-semibold tracking-tight">
              Welcome back
            </h2>
            <p className="text-sm text-muted-foreground">
              Sign in to your workspace to continue.
            </p>
          </div>

          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-5"
            noValidate
          >
            <div className="space-y-2">
              <Label htmlFor="email">Work email</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@company.com"
                  className="pl-9"
                  {...form.register("email")}
                />
              </div>
              {form.formState.errors.email && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.email.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPwd ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="pl-9 pr-10"
                  {...form.register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPwd ? "Hide password" : "Show password"}
                >
                  {showPwd ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {form.formState.errors.password && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.password.message}
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full"
              size="lg"
              loading={submitting}
            >
              Sign in
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>

          <p className="text-center text-xs text-muted-foreground">
            By signing in you agree to our{" "}
            <Link href="#" className="underline-offset-2 hover:underline">
              Terms
            </Link>{" "}
            and{" "}
            <Link href="#" className="underline-offset-2 hover:underline">
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}

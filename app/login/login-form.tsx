"use client";

import { useActionState } from "react";
import { login } from "./actions";
import { ui } from "@/lib/ui";

export function LoginForm() {
  const [state, formAction, pending] = useActionState(login, null);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm text-zinc-300">
        이메일
        <input
          name="email"
          type="email"
          autoComplete="email"
          required
          className={ui.input}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm text-zinc-300">
        비밀번호
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className={ui.input}
        />
      </label>
      {state?.error && (
        <p role="alert" className={ui.error}>
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className={`mt-2 ${ui.primary}`}
      >
        {pending ? "로그인 중…" : "로그인"}
      </button>
    </form>
  );
}

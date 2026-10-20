import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    // 작가 화면과 같은 브릿지 회색
    <main className="author-page mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-4 py-16 text-zinc-100">
      <h1 className="text-2xl font-bold">작가 로그인</h1>
      <LoginForm />
    </main>
  );
}

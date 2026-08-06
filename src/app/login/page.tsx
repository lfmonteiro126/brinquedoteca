"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Eye, EyeOff, Sparkles } from "lucide-react";

const LOGIN_BG =
  "https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?auto=format&fit=crop&w=1800&q=80";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSenha, setShowSenha] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, senha }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Email ou senha inválidos");
      return;
    }

    if (data.user?.primeiro_login) {
      router.push("/trocar-senha");
    } else if (data.user?.role === "vendedor") {
      router.push("/vendas");
    } else {
      router.push("/");
    }
    router.refresh();
  }

  return (
    <div className="relative flex min-h-screen overflow-hidden bg-[#1a1228]">
      <div className="absolute inset-0">
        <Image
          src={LOGIN_BG}
          alt=""
          fill
          priority
          sizes="100vw"
          className="login-kenburns object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-[#2b1548]/85 via-[#4a1942]/55 to-[#f59e0b]/35" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(255,255,255,0.18),transparent_45%)]" />
      </div>

      <div className="relative z-10 flex w-full flex-col lg:flex-row">
        <section className="flex flex-1 flex-col justify-between px-6 py-10 sm:px-10 lg:px-14 lg:py-14">
          <div className="login-fade flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 text-white backdrop-blur-md ring-1 ring-white/25">
              <Sparkles className="h-5 w-5" />
            </div>
            <p className="text-sm font-semibold tracking-wide text-white/90">
              Sistema da loja
            </p>
          </div>

          <div className="login-fade-up mt-16 max-w-xl lg:mt-0">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-amber-200/90">
              Praia Grande
            </p>
            <h1 className="font-display text-4xl font-bold leading-[1.05] text-white sm:text-5xl lg:text-6xl">
              Ateliê
              <br />
              Angels Kids
            </h1>
            <p className="mt-5 max-w-md text-base leading-relaxed text-white/75 sm:text-lg">
              Gestão de estoque e vendas para o dia a dia da loja — simples, rápida e segura.
            </p>
          </div>

          <p className="mt-12 hidden text-xs text-white/45 lg:block">
            Acesso exclusivo para a equipe autorizada
          </p>
        </section>

        <section className="flex flex-1 items-end justify-center px-4 pb-8 sm:px-8 lg:items-center lg:justify-end lg:pr-12 lg:pb-0">
          <div className="login-fade-up w-full max-w-md" style={{ animationDelay: "120ms" }}>
            <div className="rounded-[1.75rem] border border-white/40 bg-white/90 p-7 shadow-2xl shadow-black/25 backdrop-blur-xl dark:border-white/10 dark:bg-[#12131a]/90 sm:p-9">
              <div className="mb-7">
                <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
                  Bem-vindo de volta
                </h2>
                <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
                  Entre com seu e-mail e senha para continuar
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200/80 bg-white px-4 py-3.5 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-rose-300 focus:ring-4 focus:ring-rose-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:focus:border-rose-400/50 dark:focus:ring-rose-500/10"
                    placeholder="seu@email.com"
                    autoComplete="username"
                    required
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Senha
                  </label>
                  <div className="relative">
                    <input
                      type={showSenha ? "text" : "password"}
                      value={senha}
                      onChange={(e) => setSenha(e.target.value)}
                      className="w-full rounded-2xl border border-slate-200/80 bg-white px-4 py-3.5 pr-12 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-rose-300 focus:ring-4 focus:ring-rose-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:focus:border-rose-400/50 dark:focus:ring-rose-500/10"
                      placeholder="••••••••"
                      autoComplete="current-password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowSenha(!showSenha)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-white/10 dark:hover:text-slate-200"
                      aria-label={showSenha ? "Ocultar senha" : "Mostrar senha"}
                    >
                      {showSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <p className="rounded-2xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-400">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-2 w-full rounded-2xl bg-gradient-to-r from-rose-500 to-amber-500 py-3.5 font-semibold text-white shadow-lg shadow-rose-500/25 transition hover:brightness-105 active:scale-[0.99] disabled:opacity-60"
                >
                  {loading ? "Entrando..." : "Entrar na loja"}
                </button>
              </form>

              <p className="mt-7 text-center text-xs text-slate-400 dark:text-slate-500">
                Acesso restrito para funcionários autorizados
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

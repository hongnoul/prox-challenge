import { safeReturnPath } from "@/lib/server/security/session";

type LoginPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const parameters = await searchParams;
  const error = parameters.error === "invalid";
  const nextValue = Array.isArray(parameters.next) ? parameters.next[0] : parameters.next;
  const next = safeReturnPath(nextValue);

  return (
    <main className="login-shell">
      <section className="login-card" aria-labelledby="login-title">
        <div className="login-mark" aria-hidden="true">V</div>
        <p className="machine-label">Restricted product workspace</p>
        <h1 id="login-title">Unlock OmniPro 220</h1>
        <p className="login-copy">Enter the workspace password to continue.</p>

        <form className="login-form" action="/api/auth/login" method="post">
          <input type="hidden" name="next" value={next} />
          <label htmlFor="workspace-password">Password</label>
          <input
            id="workspace-password"
            name="password"
            type="password"
            autoComplete="current-password"
            maxLength={128}
            required
            autoFocus
            aria-invalid={error || undefined}
            aria-describedby={error ? "login-error" : undefined}
          />
          {error ? <p className="login-error" id="login-error" role="alert">That password is not valid.</p> : null}
          <button type="submit">Enter workspace</button>
        </form>
      </section>
    </main>
  );
}

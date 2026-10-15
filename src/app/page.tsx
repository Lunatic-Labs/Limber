import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Wordmark } from "@/components/ui/wordmark";
import { ButtonLink } from "@/components/ui/button";

const features = [
  {
    title: "Secure messaging",
    body: "Stay in touch with your physical therapist between sessions, with your full conversation history in one place.",
  },
  {
    title: "Photos & video",
    body: "Record yourself doing an exercise right from your phone and send it for feedback.",
  },
  {
    title: "Plans of care",
    body: "Follow your plan of care from start to finish, so you always know what comes next.",
  },
  {
    title: "Documents",
    body: "Share forms, instructions and reports with your care team without leaving the app.",
  },
];

// Signed-in users go straight to their role's dashboard. Signed-out
// visitors see the public landing page. Administrator has no UI in v1
// (see constitution.md), so it falls through to a placeholder.
export default async function Home() {
  const session = await auth();

  if (session?.user) {
    if (session.user.role === "physician") redirect("/physician");
    if (session.user.role === "patient") redirect("/patient");

    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-surface p-6 text-center">
        <Wordmark />
        <p className="text-ink-muted">
          Signed in as {session.user.name ?? session.user.email} (
          {session.user.role}). No dashboard is built for this role yet.
        </p>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-8">
        <Wordmark />
        <ButtonLink href="/login" variant="secondary">
          Sign in
        </ButtonLink>
      </header>

      <main>
        <section className="bg-gradient-to-b from-brand-50 to-white">
          <div className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-8 sm:py-24">
            <h1 className="text-4xl font-bold tracking-tight text-brand-900 sm:text-5xl">
              Physical therapy care, connected between sessions
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-lg text-ink-muted">
              Limber keeps patients and physical therapists in touch and on
              track with a clear plan of care.
            </p>
            <div className="mt-8 flex justify-center">
              <ButtonLink href="/login" className="px-8 text-lg">
                Sign in
              </ButtonLink>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-8">
          <h2 className="text-center text-2xl font-bold text-ink sm:text-3xl">
            Everything your care team needs
          </h2>
          <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f) => (
              <li
                key={f.title}
                className="rounded-xl border border-brand-100 bg-white p-6 shadow-sm"
              >
                <h3 className="text-lg font-semibold text-brand-800">{f.title}</h3>
                <p className="mt-2 text-ink-muted">{f.body}</p>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}

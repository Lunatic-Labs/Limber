import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { invitations } from "@/db/schema";
import { hashInviteToken, invitationStatus } from "@/lib/invitations";
import { Wordmark } from "@/components/ui/wordmark";
import { buttonClass } from "@/components/ui/button";
import { OnboardingForm } from "@/components/onboarding/onboarding-form";

const ROLE_LABEL = {
  patient: "patient",
  physician: "physician",
  administrator: "administrator",
} as const;

function Message({ title, body }: { title: string; body: string }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-surface p-4">
      <div className="mb-6">
        <Wordmark />
      </div>
      <div className="w-full max-w-sm space-y-4 rounded-2xl border border-brand-100 bg-white p-6 shadow-sm sm:p-8">
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="text-ink-muted">{body}</p>
        <Link href="/login" className={buttonClass("secondary", "w-full")}>
          Go to sign in
        </Link>
      </div>
    </main>
  );
}

export default async function OnboardingPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const [invite] = await db
    .select()
    .from(invitations)
    .where(eq(invitations.tokenHash, hashInviteToken(token)))
    .limit(1);

  // Unknown and revoked links look identical on purpose.
  if (!invite || invitationStatus(invite, new Date()) === "revoked") {
    return (
      <Message
        title="Invitation not found"
        body="This link isn't valid. Ask your administrator to send a new invitation."
      />
    );
  }

  const status = invitationStatus(invite, new Date());
  if (status === "accepted") {
    return (
      <Message
        title="Invitation already used"
        body="An account was already created with this link. Sign in with your email and password."
      />
    );
  }
  if (status === "expired") {
    return (
      <Message
        title="Invitation expired"
        body="This link has expired. Ask your administrator to send a new invitation."
      />
    );
  }

  return (
    <OnboardingForm
      token={token}
      email={invite.email}
      roleLabel={ROLE_LABEL[invite.role]}
    />
  );
}

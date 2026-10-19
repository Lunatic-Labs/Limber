import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { invitations } from "@/db/schema";
import { hashInviteToken, invitationStatus } from "@/lib/invitations";
import { OnboardingForm } from "@/components/onboarding/onboarding-form";

const ROLE_LABEL = {
  patient: "patient",
  physician: "physician",
  administrator: "administrator",
} as const;

function Message({ title, body }: { title: string; body: string }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-3 rounded-lg border border-gray-200 p-6">
        <h1 className="text-xl font-semibold">{title}</h1>
        <p className="text-gray-600">{body}</p>
        <Link href="/login" className="text-sm underline">
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

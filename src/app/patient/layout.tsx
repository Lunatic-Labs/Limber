import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { SignOutButton } from "@/components/sign-out-button";
import { DEV_PATIENT_PREVIEW, MOCK_PATIENT } from "@/lib/dev-preview";

export default async function PatientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = DEV_PATIENT_PREVIEW ? null : await auth();

  if (!DEV_PATIENT_PREVIEW) {
    if (!session?.user) {
      redirect("/login");
    }
    if (session.user.role !== "patient") {
      redirect("/");
    }
  }
  const name = DEV_PATIENT_PREVIEW ? MOCK_PATIENT.name : session!.user.name;

  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
        <div>
          <p className="text-sm text-gray-500">Limber &middot; Patient</p>
          <p className="font-medium">{name}</p>
        </div>
        {DEV_PATIENT_PREVIEW ? (
          <span className="text-sm text-amber-600">Dev preview</span>
        ) : (
          <SignOutButton />
        )}
      </header>
      <div className="p-6">{children}</div>
    </div>
  );
}

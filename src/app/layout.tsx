import type { Metadata, Viewport } from "next";
import { Inter, Atkinson_Hyperlegible } from "next/font/google";
import { auth } from "@/auth";
import { getPreferences } from "@/lib/preferences";
import {
  DEFAULT_PREFERENCES,
  preferencesToDataAttributes,
} from "@/lib/preferences-shared";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
// Used by the "dyslexia-friendly font" accessibility preference.
const legible = Atkinson_Hyperlegible({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-legible",
});

export const metadata: Metadata = {
  title: "Limber",
  description:
    "A physical therapy platform connecting patients and physicians between sessions.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Signed in: the DB is the source of truth (so settings follow the user
  // across devices). Signed out: always defaults, so one user's settings
  // never linger after logout (or leak to the next person on a shared device).
  const session = await auth();
  const prefs = session?.user
    ? await getPreferences(session.user.id)
    : DEFAULT_PREFERENCES;

  return (
    <html
      lang="en"
      className={`${inter.variable} ${legible.variable}`}
      {...preferencesToDataAttributes(prefs)}
    >
      <body className="min-h-screen bg-card font-sans text-base text-ink antialiased">
        {children}
      </body>
    </html>
  );
}

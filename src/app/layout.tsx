import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { Inter, Atkinson_Hyperlegible } from "next/font/google";
import { auth } from "@/auth";
import { getPreferences } from "@/lib/preferences";
import {
  PREFERENCES_COOKIE,
  parsePreferencesCookie,
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
  // across devices). Signed out (e.g. login page): use the cookie mirror.
  const session = await auth();
  const prefs = session?.user
    ? await getPreferences(session.user.id)
    : parsePreferencesCookie((await cookies()).get(PREFERENCES_COOKIE)?.value);

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

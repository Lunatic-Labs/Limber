// Re-mounts on every navigation inside this section, replaying a short
// fade-rise. The shell (sidebar/top bar) lives in layout.tsx and stays put.
// CSS animation, so the reduced-motion rules in globals.css cover it.
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="animate-fade-rise">{children}</div>;
}

export default function SimulationLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen flex flex-col overflow-hidden bg-ink-50">
      {children}
    </div>
  );
}

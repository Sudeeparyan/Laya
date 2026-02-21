// Layout — main shell with sidebar and chat area

export default function Layout({ sidebar, children }) {
  return (
    <div className="flex h-screen overflow-hidden gradient-mesh">
      {/* Sidebar */}
      {sidebar}
      {/* Main content area */}
      <main className="flex-1 flex flex-col min-w-0 relative">
        {/* Subtle top gradient accent */}
        <div className="absolute top-0 left-0 right-0 h-1 gradient-teal z-10" />
        {children}
      </main>
    </div>
  );
}

export function MainLayout({ children }) {
  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "2rem" }}>
      <header>
        <h2>Kanou Base Demo</h2>
      </header>
      <main>{children}</main>
    </div>
  );
}

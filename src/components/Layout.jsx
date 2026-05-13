import Sidebar from "./Sidebar"

export default function Layout({ children, darkMode }) {
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "transparent" }}>
      <Sidebar darkMode={darkMode} />

      <div
        style={{
          padding: "32px 36px",
          flex: 1,
          minWidth: 0,
          overflowX: "hidden",
        }}
      >
        {children}
      </div>
    </div>
  );
}
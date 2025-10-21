import { Outlet, Link } from "react-router-dom";
import "./assets/styles.css";

export default function App() {
  return (
    <div>
      <header style={headerStyle}>
        <img src="/logo.png" alt="logo" style={{ height: 40 }} />
        <h1>Downloader — A3GS Tec (React)</h1>
        <nav>
          <Link to="/">Início</Link>
        </nav>
      </header>
      <main style={{ padding: 20 }}>
        <Outlet />
      </main>
      <footer style={footerStyle}>© A3GS Tec</footer>
    </div>
  );
}

const headerStyle = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  padding: "12px",
  background: "#0b5394",
  color: "white"
};

const footerStyle = {
  textAlign: "center",
  padding: "12px",
  color: "#666"
};

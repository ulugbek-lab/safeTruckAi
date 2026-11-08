import { useState, type ReactNode } from "react";
import {
  ArrowUpRight,
  ChartNoAxesCombined,
  ClipboardList,
  HardHat,
  LayoutDashboard,
  Menu,
  ShieldCheck,
  X,
} from "lucide-react";
export function DashboardLayout({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="app-shell">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      {open && (
        <button
          className="sidebar-overlay"
          aria-label="Close navigation"
          onClick={() => setOpen(false)}
        />
      )}
      <aside
        id="primary-sidebar"
        className={`sidebar ${open ? "is-open" : ""}`}
        aria-label="Primary navigation"
      >
        <a
          className="brand"
          href="#main-content"
          onClick={() => setOpen(false)}
        >
          <span className="brand-icon">
            <ShieldCheck size={26} />
          </span>
          <span>
            SafeTruck<span className="brand-ai"> AI</span>
            <small>SAFETY INTELLIGENCE</small>
          </span>
        </a>
        <button
          className="mobile-close icon-button"
          aria-label="Close navigation"
          onClick={() => setOpen(false)}
        >
          <X size={20} />
        </button>
        <div className="workspace-card">
          <span className="workspace-icon">
            <HardHat size={20} />
          </span>
          <div>
            <strong>Workplace monitoring</strong>
            <small>PPE detection workspace</small>
          </div>
        </div>
        <span className="nav-label">WORKSPACE</span>
        <nav>
          <a
            className="nav-item active"
            href="#main-content"
            aria-current="page"
            onClick={() => setOpen(false)}
          >
            <LayoutDashboard size={18} />
            Overview
          </a>
          <a
            className="nav-item"
            href="#incident-history"
            onClick={() => setOpen(false)}
          >
            <ClipboardList size={18} />
            Incident history
          </a>
          <a
            className="nav-item"
            href="#analytics"
            onClick={() => setOpen(false)}
          >
            <ChartNoAxesCombined size={18} />
            Analytics
          </a>
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <ShieldCheck size={20} />
            <strong>Safer work starts with visibility.</strong>
            <p>
              Detect potential risks. Review incidents. Improve workplace
              safety.
            </p>
          </div>
          <span className="version-label">
            SAFETRUCK AI <span>Local MVP</span>
          </span>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-button mobile-menu"
              aria-label="Open navigation"
              aria-expanded={open}
              aria-controls="primary-sidebar"
              onClick={() => setOpen(true)}
            >
              <Menu size={21} />
            </button>
            <span>Workspace</span>
            <span className="breadcrumb-slash">/</span>
            <strong>Overview</strong>
          </div>
          <a
            className="docs-link"
            href="http://127.0.0.1:8000/docs"
            target="_blank"
            rel="noreferrer"
          >
            Local API docs
            <ArrowUpRight size={14} />
          </a>
        </header>
        <main id="main-content" tabIndex={-1}>
          {children}
        </main>
        <footer className="app-footer">
          <span>SafeTruck AI · Workplace safety intelligence</span>
          <span>AI detections require human review</span>
        </footer>
      </div>
    </div>
  );
}

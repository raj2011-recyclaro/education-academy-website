import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { LoginButton, useAuth } from "./Auth";
import { WhatsAppFloat } from "./Common";
import Logo from "./Logo";

const adminLinks = [
  ["/admin", "Dashboard"],
  ["/admin/users", "Users"],
  ["/admin/applications", "Applications"],
  ["/admin/categories", "Categories"],
  ["/admin/videos", "Videos"],
  ["/admin/bootcamps", "Bootcamps"],
  ["/admin/masterclasses", "Masterclasses"],
];

function UserMenu() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDocClick = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const close = () => setOpen(false);
  const initial = (user.fullName || user.email || "?").trim()[0]?.toUpperCase();

  return (
    <div className="user-menu" ref={rootRef}>
      <button
        type="button"
        className="user-menu-trigger"
        aria-expanded={open}
        onClick={(event) => {
          event.stopPropagation();
          setOpen((value) => !value);
        }}
      >
        {user.avatarUrl
          ? <img className="nav-avatar" src={user.avatarUrl} alt="" />
          : <span className="nav-avatar nav-avatar-fallback">{initial}</span>}
        <span className="nav-user-name">{user.fullName?.split(" ")[0] || user.email}</span>
        <span className="user-menu-caret">▾</span>
      </button>
      {open && (
        <div className="user-menu-panel" onClick={(event) => event.stopPropagation()}>
          <div className="user-menu-profile">
            <b>{user.fullName || "Your account"}</b>
            <small>{user.email}</small>
            <span className={`status-badge ${user.role}`}>{user.role}</span>
          </div>
          <Link to="/my-courses" onClick={close}>My Courses</Link>
          {user.role === "teacher" && <Link to="/teacher" onClick={close}>My Teaching</Link>}
          {user.role === "admin" && (
            <>
              <div className="user-menu-divider">Admin</div>
              {adminLinks.map(([to, label]) => <Link key={to} to={to} onClick={close}>{label}</Link>)}
            </>
          )}
          <button type="button" className="user-menu-signout" onClick={() => { logout(); close(); }}>Sign out</button>
        </div>
      )}
    </div>
  );
}

export function Header() {
  const [open, setOpen] = useState(false);
  const { user, loading } = useAuth();
  const links = [
    ["/masterclasses", "Masterclasses"],
    ["/bootcamps", "Bootcamps"],
    ["/become-instructor", "Become Instructor"],
    ["/contact", "Contact"],
  ];
  return (
    <header className="site-header">
      <div className="nav-wrap">
        <Logo className="brand" />
        <button className="menu-button" aria-label="Toggle menu" onClick={() => setOpen(!open)}>☰</button>
        <nav className={open ? "nav-links open" : "nav-links"} onClick={() => setOpen(false)}>
          {links.map(([to, label]) => <NavLink key={to} to={to}>{label}</NavLink>)}
          {!loading && !user && <LoginButton label="Login" className="button small" redirectAfterLogin />}
          {user && <UserMenu />}
          <Link className="button small" to="/masterclasses">Start Learning</Link>
        </nav>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer>
      <div className="footer-wrap">
        <div>
          <Logo className="brand" showTagline variant="footer" />
          <p>Live learning for ambitious, curious people.</p>
        </div>
        <div className="footer-links">
          <Link to="/masterclasses">Masterclasses</Link>
          <Link to="/bootcamps">Bootcamps</Link>
          <Link to="/become-instructor">Teach</Link>
          <Link to="/contact">Support</Link>
        </div>
        <small>© 2026 UpSkillr.in</small>
      </div>
    </footer>
  );
}

export default function Layout() {
  const location = useLocation();
  return <><Header /><div className="route-transition" key={location.pathname}><Outlet /></div><Footer /><WhatsAppFloat /></>;
}

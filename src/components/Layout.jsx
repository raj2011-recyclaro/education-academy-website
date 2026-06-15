import { useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";

export function Header() {
  const [open, setOpen] = useState(false);
  const links = [
    ["/masterclasses", "Masterclasses"],
    ["/bootcamps", "Bootcamps"],
    ["/become-instructor", "Become Instructor"],
    ["/contact", "Contact"],
  ];
  return (
    <header className="site-header">
      <div className="nav-wrap">
        <Link className="brand" to="/">Academy</Link>
        <button className="menu-button" aria-label="Toggle menu" onClick={() => setOpen(!open)}>☰</button>
        <nav className={open ? "nav-links open" : "nav-links"} onClick={() => setOpen(false)}>
          {links.map(([to, label]) => <NavLink key={to} to={to}>{label}</NavLink>)}
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
        <div><Link className="brand" to="/">Academy</Link><p>Live learning for ambitious, curious people.</p></div>
        <div className="footer-links"><Link to="/masterclasses">Masterclasses</Link><Link to="/bootcamps">Bootcamps</Link><Link to="/become-instructor">Teach</Link><Link to="/contact">Support</Link></div>
        <small>© 2026 Academy</small>
      </div>
    </footer>
  );
}

export default function Layout() {
  const location = useLocation();
  return <><Header /><div className="route-transition" key={location.pathname}><Outlet /></div><Footer /></>;
}

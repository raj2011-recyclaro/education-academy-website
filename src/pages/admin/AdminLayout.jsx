import { NavLink, Outlet } from "react-router-dom";
import { RequireRole } from "../../components/Auth";

const links = [
  ["/admin", "Dashboard", true],
  ["/admin/users", "Users"],
  ["/admin/applications", "Applications"],
  ["/admin/categories", "Categories"],
  ["/admin/videos", "Videos"],
  ["/admin/bootcamps", "Bootcamps"],
  ["/admin/masterclasses", "Masterclasses"],
];

export default function AdminLayout() {
  return (
    <RequireRole roles={["admin"]}>
      <div className="admin-shell">
        <nav className="admin-nav">
          <div className="admin-nav-title">Admin</div>
          {links.map(([to, label, end]) => (
            <NavLink key={to} to={to} end={end}>{label}</NavLink>
          ))}
        </nav>
        <div className="admin-content">
          <Outlet />
        </div>
      </div>
    </RequireRole>
  );
}

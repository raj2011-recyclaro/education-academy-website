import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getAdminApplications, getAdminBootcamps, getAdminMasterclasses, getAdminUsers } from "../../lib/api";

export default function AdminDashboardPage() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    let active = true;
    Promise.all([
      getAdminUsers({ pageSize: 1 }),
      getAdminApplications({ status: "new", pageSize: 1 }),
      getAdminBootcamps(),
      getAdminMasterclasses(),
    ])
      .then(([users, newApplications, bootcamps, masterclasses]) => {
        if (!active) return;
        setStats({
          totalUsers: users.pagination?.total ?? users.data.length,
          newApplications: newApplications.pagination?.total ?? newApplications.data.length,
          bootcampsPublished: bootcamps.filter((c) => c.visibilityStatus === "published").length,
          bootcampsDraft: bootcamps.filter((c) => c.visibilityStatus === "draft").length,
          masterclassesPublished: masterclasses.filter((c) => c.visibilityStatus === "published").length,
          masterclassesDraft: masterclasses.filter((c) => c.visibilityStatus === "draft").length,
        });
      })
      .catch((error) => console.warn("Could not load dashboard stats:", error.message));
    return () => {
      active = false;
    };
  }, []);

  return (
    <>
      <div className="admin-header">
        <div>
          <div className="eyebrow">Admin</div>
          <h1>Dashboard</h1>
        </div>
      </div>
      <div className="admin-stats">
        <div className="admin-stat-card card"><b>{stats?.totalUsers ?? "—"}</b><span>Total users</span></div>
        <div className="admin-stat-card card"><b>{stats?.newApplications ?? "—"}</b><span>New applications</span></div>
        <div className="admin-stat-card card"><b>{stats ? stats.bootcampsPublished : "—"}</b><span>Bootcamps published</span></div>
        <div className="admin-stat-card card"><b>{stats ? stats.bootcampsDraft : "—"}</b><span>Bootcamps draft</span></div>
        <div className="admin-stat-card card"><b>{stats ? stats.masterclassesPublished : "—"}</b><span>Masterclasses published</span></div>
        <div className="admin-stat-card card"><b>{stats ? stats.masterclassesDraft : "—"}</b><span>Masterclasses draft</span></div>
      </div>
      <p>
        Use the left navigation to manage users, review instructor applications, and publish content.
        Jump straight to <Link to="/admin/applications">applications</Link> or{" "}
        <Link to="/admin/bootcamps">bootcamps</Link>.
      </p>
    </>
  );
}

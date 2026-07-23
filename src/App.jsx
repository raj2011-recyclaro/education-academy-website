import { Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import { NotFoundPage, ScrollToTop } from "./components/Common";
import { AuthProvider, RequireAuth, RequireRole } from "./components/Auth";
import HomePage from "./pages/HomePage";
import MasterclassesPage from "./pages/MasterclassesPage";
import BootcampsPage from "./pages/BootcampsPage";
import MasterclassDetailPage from "./pages/MasterclassDetailPage";
import BootcampDetailPage from "./pages/BootcampDetailPage";
import SuccessPage from "./pages/SuccessPage";
import InfoPage from "./pages/InfoPage";
import MyCoursesPage from "./pages/MyCoursesPage";
import TeacherPage from "./pages/TeacherPage";
import AdminLayout from "./pages/admin/AdminLayout";
import AdminDashboardPage from "./pages/admin/DashboardPage";
import AdminUsersPage from "./pages/admin/UsersPage";
import AdminApplicationsPage from "./pages/admin/ApplicationsPage";
import AdminCategoriesPage from "./pages/admin/CategoriesPage";
import AdminVideosPage from "./pages/admin/VideosPage";
import AdminBootcampsPage from "./pages/admin/BootcampsPage";
import AdminBootcampEditPage from "./pages/admin/BootcampEditPage";
import AdminMasterclassesPage from "./pages/admin/MasterclassesPage";
import AdminMasterclassEditPage from "./pages/admin/MasterclassEditPage";

export default function App() {
  return <>
    <ScrollToTop />
    <AuthProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/masterclasses" element={<MasterclassesPage />} />
          <Route path="/bootcamps" element={<BootcampsPage />} />
          <Route path="/masterclasses/:slug" element={<MasterclassDetailPage />} />
          <Route path="/bootcamps/:slug" element={<BootcampDetailPage />} />
          <Route path="/my-courses" element={<RequireAuth><MyCoursesPage /></RequireAuth>} />
          <Route path="/teacher" element={<RequireRole roles={["teacher"]}><TeacherPage /></RequireRole>} />
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboardPage />} />
            <Route path="users" element={<AdminUsersPage />} />
            <Route path="applications" element={<AdminApplicationsPage />} />
            <Route path="categories" element={<AdminCategoriesPage />} />
            <Route path="videos" element={<AdminVideosPage />} />
            <Route path="bootcamps" element={<AdminBootcampsPage />} />
            <Route path="bootcamps/new" element={<AdminBootcampEditPage />} />
            <Route path="bootcamps/:id" element={<AdminBootcampEditPage />} />
            <Route path="masterclasses" element={<AdminMasterclassesPage />} />
            <Route path="masterclasses/new" element={<AdminMasterclassEditPage />} />
            <Route path="masterclasses/:id" element={<AdminMasterclassEditPage />} />
          </Route>
          <Route path="/registration-success" element={<SuccessPage />} />
          <Route path="/become-instructor" element={<InfoPage type="instructor" />} />
          <Route path="/contact" element={<InfoPage type="contact" />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </AuthProvider>
  </>;
}

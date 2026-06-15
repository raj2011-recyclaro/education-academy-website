import { Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import { NotFoundPage, ScrollToTop } from "./components/Common";
import HomePage from "./pages/HomePage";
import MasterclassesPage from "./pages/MasterclassesPage";
import BootcampsPage from "./pages/BootcampsPage";
import MasterclassDetailPage from "./pages/MasterclassDetailPage";
import BootcampDetailPage from "./pages/BootcampDetailPage";
import SuccessPage from "./pages/SuccessPage";
import InfoPage from "./pages/InfoPage";

export default function App() {
  return <>
    <ScrollToTop />
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/masterclasses" element={<MasterclassesPage />} />
        <Route path="/bootcamps" element={<BootcampsPage />} />
        <Route path="/masterclasses/:slug" element={<MasterclassDetailPage />} />
        <Route path="/bootcamps/:slug" element={<BootcampDetailPage />} />
        <Route path="/registration-success" element={<SuccessPage />} />
        <Route path="/become-instructor" element={<InfoPage type="instructor" />} />
        <Route path="/contact" element={<InfoPage type="contact" />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  </>;
}

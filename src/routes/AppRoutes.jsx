import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes, useParams } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider.jsx";
import Layout from "../components/Layout.jsx";
import Loading from "../components/Loading.jsx";

const LoginPage = lazy(() => import("../auth/LoginPage.jsx"));
const AdminPage = lazy(() => import("../pages/AdminPage.jsx"));
const EventListPage = lazy(() => import("../pages/EventListPage.jsx"));
const EventEditPage = lazy(() => import("../pages/EventEditPage.jsx"));
const ProfilePage = lazy(() => import("../pages/ProfilePage.jsx"));
const ScheduleDaysPage = lazy(() => import("../pages/ScheduleDaysPage.jsx"));
const ScheduleDetailsPage = lazy(() => import("../pages/ScheduleDetailsPage.jsx"));
const CompaniesPage = lazy(() => import("../pages/CompaniesPage.jsx"));

function LazyRoute({ Component }) {
  return (
    <Suspense fallback={<Loading />}>
      <Component />
    </Suspense>
  );
}

function ProtectedRoute() {
  const { user, authLoading } = useAuth();

  if (authLoading) {
    return <Loading />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Layout />;
}

function EventEditRedirect() {
  const { eventId } = useParams();
  return <Navigate to={`/events/${eventId}/edit`} replace />;
}

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LazyRoute Component={LoginPage} />} />
        <Route element={<ProtectedRoute />}>
          <Route index element={<Navigate to="/events" replace />} />
          <Route path="/events" element={<LazyRoute Component={EventListPage} />} />
          <Route path="/events/:eventId" element={<EventEditRedirect />} />
          <Route path="/events/:eventId/edit" element={<LazyRoute Component={EventEditPage} />} />
          <Route path="/events/:eventId/days" element={<LazyRoute Component={ScheduleDaysPage} />} />
          <Route
            path="/events/:eventId/days/:scheduleDayId/details"
            element={<LazyRoute Component={ScheduleDetailsPage} />}
          />
          <Route path="/companies" element={<LazyRoute Component={CompaniesPage} />} />
          <Route path="/admin" element={<LazyRoute Component={AdminPage} />} />
          <Route path="/profile" element={<LazyRoute Component={ProfilePage} />} />
        </Route>
        <Route path="*" element={<Navigate to="/events" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

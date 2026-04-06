import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import AuthPage from "./pages/AuthPage";
import DashboardPage from "./pages/DashboardPage";
import CheckinPage from "./pages/CheckinPage";
import FaceCheckinKioskPage from "./pages/FaceCheckinKioskPage";
import MyQrCodePage from "./pages/MyQrCodePage";
import SchedulesPage from "./pages/SchedulesPage";
import ReportsPage from "./pages/ReportsPage";
import AdminPage from "./pages/AdminPage";
import QrCodeManagementPage from "./pages/QrCodeManagementPage";
import CheckInHistoryPage from "./pages/CheckInHistoryPage";
import ServiceCheckInHistoryPage from "./pages/ServiceCheckInHistoryPage";
import ProfilePage from "./pages/ProfilePage";
import PlanningCenterCallback from "./pages/PlanningCenterCallback";
import SelfCheckinPage from "./pages/SelfCheckinPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/planning-center/callback" element={<PlanningCenterCallback />} />
            <Route path="/checkin/kiosk" element={<FaceCheckinKioskPage />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/checkin" element={<CheckinPage />} />
              <Route path="/my-qrcode" element={<MyQrCodePage />} />
              <Route path="/schedules" element={<SchedulesPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/admin" element={<AdminPage />} />
              <Route path="/qr-codes" element={<QrCodeManagementPage />} />
              <Route path="/history" element={<CheckInHistoryPage />} />
              <Route path="/history/:volunteerId" element={<CheckInHistoryPage />} />
              <Route path="/history/by-name/:volunteerName" element={<CheckInHistoryPage />} />
              <Route path="/service/:serviceId/checkins" element={<ServiceCheckInHistoryPage />} />
              <Route path="/service-history" element={<ServiceCheckInHistoryPage />} />
              <Route path="/profile" element={<ProfilePage />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;

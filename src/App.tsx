import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import TwoFASetup from "./pages/TwoFASetup";
import TwoFAVerify from "./pages/TwoFAVerify";
import Settings from "./pages/Settings";
import HostDetail from "./pages/HostDetail";
import Dashboard from "./pages/Dashboard";
import Hosts from "./pages/Hosts";
import Problems from "./pages/Problems";
import Traps from "./pages/Traps";
import Insights from "./pages/Insights";
import Reports from "./pages/Reports";
import NotFound from "./pages/NotFound";
import FloatingAIChat from "./components/ai/FloatingAIChat";
import CommandPalette from "./components/CommandPalette";
import OrgAdmin from "./pages/admin/OrgAdmin";
import SuperAdmin from "./pages/admin/SuperAdmin";
import UserManagement from "./pages/admin/UserManagement";
import Billing from "./pages/admin/Billing";
import Organizations from "./pages/admin/Organizations";
import SecurityLogs from "./pages/admin/SecurityLogs";

const queryClient = new QueryClient();

// Simple auth check
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const isAuthenticated = localStorage.getItem("nebula_auth") === "true";
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/2fa/setup" element={<TwoFASetup />} />
          <Route path="/2fa/verify" element={<TwoFAVerify />} />
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/hosts" element={<ProtectedRoute><Hosts /></ProtectedRoute>} />
          <Route path="/hosts/:id" element={<ProtectedRoute><HostDetail /></ProtectedRoute>} />
          <Route path="/problems" element={<ProtectedRoute><Problems /></ProtectedRoute>} />
          <Route path="/traps" element={<ProtectedRoute><Traps /></ProtectedRoute>} />
          <Route path="/insights" element={<ProtectedRoute><Insights /></ProtectedRoute>} />
          <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
          <Route path="/admin/org" element={<ProtectedRoute><OrgAdmin /></ProtectedRoute>} />
          <Route path="/admin/super" element={<ProtectedRoute><SuperAdmin /></ProtectedRoute>} />
          <Route path="/admin/users" element={<ProtectedRoute><UserManagement /></ProtectedRoute>} />
          <Route path="/admin/billing" element={<ProtectedRoute><Billing /></ProtectedRoute>} />
          <Route path="/admin/organizations" element={<ProtectedRoute><Organizations /></ProtectedRoute>} />
          <Route path="/admin/security-logs" element={<ProtectedRoute><SecurityLogs /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        <CommandPalette />
        <FloatingAIChat />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

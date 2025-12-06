import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import CreatePrank from "./pages/CreatePrank";
import History from "./pages/History";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminVoices from "./pages/admin/AdminVoices";
import AdminPresets from "./pages/admin/AdminPresets";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminCalls from "./pages/admin/AdminCalls";
import AdminPhoneNumbers from "./pages/admin/AdminPhoneNumbers";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/auth" replace />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/create-prank" element={<CreatePrank />} />
          <Route path="/history" element={<History />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/voices" element={<AdminVoices />} />
          <Route path="/admin/presets" element={<AdminPresets />} />
          <Route path="/admin/users" element={<AdminUsers />} />
          <Route path="/admin/calls" element={<AdminCalls />} />
          <Route path="/admin/phone-numbers" element={<AdminPhoneNumbers />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import CookieBanner from "@/components/CookieBanner";

// Eager load landing and auth pages for fast initial navigation
import Inizia from "./pages/Inizia";
import Auth from "./pages/Auth";

// Lazy load other pages
const Dashboard = lazy(() => import("./pages/Dashboard"));
const CreatePrank = lazy(() => import("./pages/CreatePrank"));
const History = lazy(() => import("./pages/History"));
const Settings = lazy(() => import("./pages/Settings"));
const Pricing = lazy(() => import("./pages/Pricing"));
const PaymentSuccess = lazy(() => import("./pages/PaymentSuccess"));
const VerifyPhone = lazy(() => import("./pages/VerifyPhone"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const TermsAndConditions = lazy(() => import("./pages/TermsAndConditions"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const CookiePolicy = lazy(() => import("./pages/CookiePolicy"));
const BlockAndReport = lazy(() => import("./pages/BlockAndReport"));
const NotFound = lazy(() => import("./pages/NotFound"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminVoices = lazy(() => import("./pages/admin/AdminVoices"));
const AdminPresets = lazy(() => import("./pages/admin/AdminPresets"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const AdminCalls = lazy(() => import("./pages/admin/AdminCalls"));
const AdminPhoneNumbers = lazy(() => import("./pages/admin/AdminPhoneNumbers"));
const AdminCallerIds = lazy(() => import("./pages/admin/AdminCallerIds"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings"));
const AdminPromoCodes = lazy(() => import("./pages/admin/AdminPromoCodes"));
const AdminContentChecker = lazy(() => import("./pages/admin/AdminContentChecker"));
const AdminAbuseReports = lazy(() => import("./pages/admin/AdminAbuseReports"));
const AdminKPI = lazy(() => import("./pages/admin/AdminKPI"));
const AdminPurchases = lazy(() => import("./pages/admin/AdminPurchases"));

const queryClient = new QueryClient();

// Simple loading fallback
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <CookieBanner />
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Navigate to="/inizia" replace />} />
            <Route path="/inizia" element={<Inizia />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/create-prank" element={<CreatePrank />} />
            <Route path="/history" element={<History />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/payment-success" element={<PaymentSuccess />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/verify-phone" element={<VerifyPhone />} />
            <Route path="/terms-and-conditions" element={<TermsAndConditions />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/cookie-policy" element={<CookiePolicy />} />
            <Route path="/blocca-segnala" element={<BlockAndReport />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/voices" element={<AdminVoices />} />
            <Route path="/admin/presets" element={<AdminPresets />} />
            <Route path="/admin/users" element={<AdminUsers />} />
            <Route path="/admin/calls" element={<AdminCalls />} />
            <Route path="/admin/phone-numbers" element={<AdminPhoneNumbers />} />
            <Route path="/admin/caller-ids" element={<AdminCallerIds />} />
            <Route path="/admin/settings" element={<AdminSettings />} />
            <Route path="/admin/promo-codes" element={<AdminPromoCodes />} />
            <Route path="/admin/content-checker" element={<AdminContentChecker />} />
            <Route path="/admin/abuse-reports" element={<AdminAbuseReports />} />
            <Route path="/admin/kpi" element={<AdminKPI />} />
            <Route path="/admin/purchases" element={<AdminPurchases />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import {ClinicalShell} from "./components/ClinicalShell";
import Command from "./pages/Command";
import Index from "./pages/Index";
import OPDQueue from "./pages/OPDQueue";
import PostOpMonitoring from "./pages/PostOpMonitoring";
import Alerts from "./pages/Alerts";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import PatientDashboard from "./pages/PatientDashboard";
import Login from "./pages/Login";
import HealthProfile from "./pages/HealthProfile";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="/" element={<Command />} />
          <Route path="/about" element={<Index />} />
          <Route path="/login" element={<ClinicalShell><Login /></ClinicalShell>} />
          <Route path="/opd-queue" element={<ClinicalShell><OPDQueue /></ClinicalShell>} />
          <Route path="/post-op" element={<ClinicalShell><PostOpMonitoring /></ClinicalShell>} />
          <Route path="/alerts" element={<ClinicalShell><Alerts /></ClinicalShell>} />
          <Route path="/reports" element={<ClinicalShell><Reports /></ClinicalShell>} />
          <Route path="/settings" element={<ClinicalShell><Settings /></ClinicalShell>} />
          <Route path="/patient" element={<ClinicalShell><PatientDashboard /></ClinicalShell>} />
          <Route path="/health-profile" element={<ClinicalShell><HealthProfile /></ClinicalShell>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

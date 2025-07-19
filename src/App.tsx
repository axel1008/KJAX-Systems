// src/App.tsx
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout/Layout";
import { AuthProvider, useAuth } from "./Context/AuthContext";
import { WelcomeProvider } from "./Context/WelcomeContext";
import WelcomeMessage from "./components/ui/WelcomeMessage";
import { NotificationProvider } from "./Context/NotificationContext";

// Importa todas tus páginas aquí:
import DashboardPage from "./pages/dashboard";
import ClientsPage from "./pages/clients";
import InventoryPage from "./pages/inventory";
import InvoicingPage from "./pages/invoicing";
import ProvidersPage from "./pages/providers";
import { AccountsPayablePage } from "./pages/accounts-payable";
import ProductionReportsPage from "./pages/production-reports";
import LoginPage from "./pages/login/LoginPage";               // ← Impórtalo
import ResetPasswordPage from "./pages/login/ResetPasswordPage"; // ← Y este si no lo tenías
import AuditLogPage from "./pages/audit-log";

const AppRoutes = () => {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50">
        <p>Cargando...</p>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/update-password" element={<ResetPasswordPage />} />

      {/* Rutas Protegidas */}
      <Route path="/" element={session ? <Layout /> : <Navigate to="/login" />}>
        <Route index element={<DashboardPage />} />
        <Route path="clients/*" element={<ClientsPage />} />
        <Route path="inventory/*" element={<InventoryPage />} />
        <Route path="invoicing/*" element={<InvoicingPage />} />
        <Route path="providers/*" element={<ProvidersPage />} />
        <Route path="accounts-payable/*" element={<AccountsPayablePage />} />
        <Route path="reports/*" element={<ProductionReportsPage />} />
        <Route path="audit-log" element={<AuditLogPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
};

export default function App(): JSX.Element {
  return (
    <AuthProvider>
      <WelcomeProvider>
        <NotificationProvider>
          <WelcomeMessage />
          <AppRoutes />
        </NotificationProvider>
      </WelcomeProvider>
    </AuthProvider>
  );
}

import React, { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "./context/AuthContext";
import ErrorBoundary from "./components/ErrorBoundary";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import queryClient from "./api/queryClient";
import LoadingSpinner from "./components/ui/LoadingSpinner";

// Eager loaded pages (critical for initial load)
import LandingPage from "./pages/Landing";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
const ForgotPassword = lazy(() => import("./pages/auth/ForgotPassword"));

// Lazy loaded pages (code splitting for better performance)
const SearchPage = lazy(() => import("./pages/tenant/Search"));
const DetailsPage = lazy(() => import("./pages/tenant/Details"));
const TenantDashboard = lazy(() => import("./pages/tenant/Dashboard"));
const SavedHomesPage = lazy(() => import("./pages/tenant/SavedHomes"));
const NotificationsPage = lazy(() => import("./pages/tenant/Notifications"));
const OwnerDashboard = lazy(() => import("./pages/owner/Overview"));
const OwnerListings = lazy(() => import("./pages/owner/Listings"));
const AddListing = lazy(() => import("./pages/owner/AddListing"));
const OwnerBookings = lazy(() => import("./pages/owner/Bookings"));
const EditListing = lazy(() => import("./pages/owner/EditListing"));
const ChatPage = lazy(() => import("./pages/chat/ChatPage"));
const PaymentHistory = lazy(() => import("./pages/payment/PaymentHistory"));
const Profile = lazy(() => import("./pages/user/Profile"));
const Settings = lazy(() => import("./pages/user/Settings"));
const AdminDashboard = lazy(() => import("./pages/admin/Dashboard"));
const ListingManagement = lazy(() => import("./pages/admin/ListingManagement"));
const UserManagement = lazy(() => import("./pages/admin/UserManagement"));
const AdminAnalytics = lazy(() => import("./pages/admin/Analytics"));
const AuditLogs = lazy(() => import("./pages/admin/AuditLogs"));

// Loading fallback component
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center">
      <LoadingSpinner size="lg" />
      <p className="mt-4 text-gray-600">Loading...</p>
    </div>
  </div>
);

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <BrowserRouter>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                {/* Public Routes */}
                <Route path="/" element={<LandingPage />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/search" element={<SearchPage />} />
                <Route path="/details/:id" element={<DetailsPage />} />
                <Route
                  path="/saved"
                  element={
                    <ProtectedRoute roles={["tenant"]}>
                      <SavedHomesPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/notifications"
                  element={
                    <ProtectedRoute>
                      <NotificationsPage />
                    </ProtectedRoute>
                  }
                />

                {/* Protected Routes - Tenant */}
                <Route
                  path="/tenant/dashboard"
                  element={
                    <ProtectedRoute roles={["tenant"]}>
                      <TenantDashboard />
                    </ProtectedRoute>
                  }
                />

                {/* Protected Routes - Owner */}
                <Route
                  path="/owner/dashboard"
                  element={
                    <ProtectedRoute roles={["owner"]}>
                      <OwnerDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/owner/listings"
                  element={
                    <ProtectedRoute roles={["owner"]}>
                      <OwnerListings />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/owner/listings/add"
                  element={
                    <ProtectedRoute roles={["owner"]}>
                      <AddListing />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/owner/listings/:id/edit"
                  element={
                    <ProtectedRoute roles={["owner"]}>
                      <EditListing />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/owner/bookings"
                  element={
                    <ProtectedRoute roles={["owner"]}>
                      <OwnerBookings />
                    </ProtectedRoute>
                  }
                />

                {/* Protected Routes - All Authenticated Users */}
                <Route
                  path="/messages"
                  element={
                    <ProtectedRoute>
                      <ChatPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/payments"
                  element={
                    <ProtectedRoute>
                      <PaymentHistory />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/profile"
                  element={
                    <ProtectedRoute>
                      <Profile />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/settings"
                  element={
                    <ProtectedRoute>
                      <Settings />
                    </ProtectedRoute>
                  }
                />

                {/* Protected Routes - Admin Only */}
                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute roles={["admin"]}>
                      <AdminDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/listings"
                  element={
                    <ProtectedRoute roles={["admin"]}>
                      <ListingManagement />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/users"
                  element={
                    <ProtectedRoute roles={["admin"]}>
                      <UserManagement />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/analytics"
                  element={
                    <ProtectedRoute roles={["admin"]}>
                      <AdminAnalytics />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/logs"
                  element={
                    <ProtectedRoute roles={["admin"]}>
                      <AuditLogs />
                    </ProtectedRoute>
                  }
                />

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </Suspense>
          </BrowserRouter>

          {/* Global Toast Notifications */}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: "#fff",
                color: "#363636",
                padding: "16px",
                borderRadius: "8px",
                boxShadow:
                  "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
              },
              success: {
                iconTheme: {
                  primary: "#10B981",
                  secondary: "#fff",
                },
              },
              error: {
                iconTheme: {
                  primary: "#EF4444",
                  secondary: "#fff",
                },
              },
            }}
          />
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;

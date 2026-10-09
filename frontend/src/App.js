import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { I18nProvider } from "@/contexts/I18nContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Chat from "@/pages/Chat";
import Profile from "@/pages/Profile";
import History from "@/pages/History";
import Admin from "@/pages/Admin";
import Library from "@/pages/Library";

function HomeRedirect() {
  const { user, loading } = useAuth();
  if (!loading && user) return <Navigate to={user.role === "admin" ? "/admin" : "/chat"} replace />;
  return <Landing />;
}

export default function App() {
  return (
    <div className="App">
      <I18nProvider>
        <AuthProvider>
          <BrowserRouter>
            <Toaster position="top-right" richColors />
            <Routes>
              <Route path="/" element={<HomeRedirect />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/library" element={<Library />} />
              <Route path="/chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
              <Route path="/chat/:id" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
              <Route path="/history" element={<ProtectedRoute><History /></ProtectedRoute>} />
              <Route path="/admin" element={<ProtectedRoute adminOnly><Admin /></ProtectedRoute>} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </I18nProvider>
    </div>
  );
}

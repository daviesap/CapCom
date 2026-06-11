import { AuthProvider } from "./auth/AuthProvider.jsx";
import AppUpdatePrompt from "./components/AppUpdatePrompt.jsx";
import AppRoutes from "./routes/AppRoutes.jsx";

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
      <AppUpdatePrompt />
    </AuthProvider>
  );
}

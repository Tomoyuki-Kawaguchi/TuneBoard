import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { Layout } from '@/features/layout/Layout';
import { Login } from '@/pages/Login';
import { RequireAuth } from '@/features/auth/RequireAuth';
import { TenantsPage } from './features/tenants/TenantsPage';
import { PublicLivePage } from './pages/public/PublicLivePage';
import { TenantLivesPage } from './features/lives/TenantLivesPage';
import { LiveManagementPage } from './features/lives/LiveManagementPage';
import { LiveFormEditorPage } from './features/lives/LiveFormEditorPage';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/public/lives/:publicToken" element={<PublicLivePage />} />
          <Route path="/public/lives/:publicToken/submissions/:submissionId" element={<PublicLivePage />} />
          <Route
            path="/"
            element={
              <RequireAuth>
                <Layout />
              </RequireAuth>
            }
          >
            <Route index element={<Navigate to="tenants" replace />} />
            <Route path="tenants" element={<TenantsPage />} />
            <Route path="tenants/:tenantId/lives" element={<TenantLivesPage />} />
            <Route path="tenants/:tenantId/lives/:liveId" element={<LiveManagementPage />} />
            <Route path="tenants/:tenantId/lives/:liveId/form" element={<LiveFormEditorPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;

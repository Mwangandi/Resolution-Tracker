/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router';
import { AppProvider } from './store';
import { Login } from './pages/Login';
import { AppLayout } from './components/layout/AppLayout';
import { Dashboard } from './pages/Dashboard';
import { ResolutionsList } from './pages/Resolutions';
import { ResolutionDetail } from './pages/ResolutionDetail';
import { CreateResolution } from './pages/CreateResolution';
import { AuditLogs } from './pages/AuditLogs';
import { SystemSettings } from './pages/SystemSettings';
import { UserManagement } from './pages/UserManagement';

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/resolutions" element={<ResolutionsList />} />
            <Route path="/resolutions/new" element={<CreateResolution />} />
            <Route path="/resolutions/:id" element={<ResolutionsList />} />
            <Route path="/audit-logs" element={<AuditLogs />} />
            <Route path="/settings" element={<SystemSettings />} />
            <Route path="/users" element={<UserManagement />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}

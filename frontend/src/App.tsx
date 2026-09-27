import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { UserProvider } from './context/UserContext';
import { Layout } from './components/layout/Layout';
import Dashboard from './pages/Dashboard';
import DailyLogs from './pages/DailyLogs';
import Timeline from './pages/Timeline';
import GraphPage from './pages/GraphPage';
import WhatIf from './pages/WhatIf';
import Profile from './pages/Profile';

export default function App() {
  return (
    <UserProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="logs" element={<DailyLogs />} />
            <Route path="timeline" element={<Timeline />} />
            <Route path="graph" element={<GraphPage />} />
            <Route path="what-if" element={<WhatIf />} />
            <Route path="profile" element={<Profile />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </UserProvider>
  );
}

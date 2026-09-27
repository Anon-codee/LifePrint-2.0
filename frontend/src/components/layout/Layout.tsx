import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useUser } from '../../context/UserContext';

const getHeaderConfig = (pathname: string, userId: string | null) => {
  switch (pathname) {
    case '/':
      return { title: `Good morning, ${userId}`, subtitle: "Here's what LifePrint noticed about you." };
    case '/logs':
      return { title: 'Daily Logs', subtitle: "Your chronological health history." };
    case '/timeline':
      return { title: 'Timeline', subtitle: "Longitudinal health view." };
    case '/graph':
      return { title: 'Personal Health Graph', subtitle: "Relationships discovered from your history." };
    case '/what-if':
      return { title: 'What-If Simulator', subtitle: "Explore hypothetical scenarios." };
    case '/profile':
      return { title: 'My Health Profile', subtitle: "This is what LifePrint currently considers your normal." };
    default:
      return { title: 'LifePrint' };
  }
};

export function Layout() {
  const location = useLocation();
  const { selectedUserId, loading, error } = useUser();
  
  const headerConfig = getHeaderConfig(location.pathname, selectedUserId);

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-md">
          <h2 className="text-xl font-medium text-red-400">Connection Error</h2>
          <p className="text-slate-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-950 text-slate-200 overflow-hidden font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <Header title={headerConfig.title} subtitle={headerConfig.subtitle} />
        <main className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-pulse flex flex-col items-center gap-4 text-slate-500">
                <div className="w-8 h-8 rounded-full border-2 border-slate-600 border-t-blue-500 animate-spin"></div>
                Loading personalized data...
              </div>
            </div>
          ) : (
            <Outlet />
          )}
        </main>
      </div>
    </div>
  );
}

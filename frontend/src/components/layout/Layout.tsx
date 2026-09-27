
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useUser } from '../../context/UserContext';

const getHeaderConfig = (
  pathname: string,
  userId: string | null
) => {
  switch (pathname) {
    case '/':
      return {
        title: userId ? `Your health, ${userId}` : 'Your health',
        subtitle: 'A closer look at your daily health patterns.',
      };

    case '/logs':
      return {
        title: 'Daily Logs',
        subtitle: 'Your recorded health history, day by day.',
      };

    case '/timeline':
      return {
        title: 'Timeline',
        subtitle: 'See how your health signals change over time.',
      };

    case '/graph':
      return {
        title: 'Personal Health Graph',
        subtitle: 'Explore relationships in your health history.',
      };

    case '/what-if':
      return {
        title: 'What-If Simulator',
        subtitle: 'Explore hypothetical changes to your routine.',
      };

    case '/profile':
      return {
        title: 'My Health Profile',
        subtitle: 'Your personal baselines and discovered patterns.',
      };

    default:
      return {
        title: 'LifePrint',
        subtitle: 'Your personalized health overview.',
      };
  }
};

export function Layout() {
  const location = useLocation();
  const { selectedUserId, loading, error } = useUser();

  const headerConfig = getHeaderConfig(
    location.pathname,
    selectedUserId
  );

  if (error) {
    return (
      <div className="lifeprint-app flex min-h-screen items-center justify-center p-6">
        <div className="lp-card w-full max-w-md p-8 text-center">
          <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-[#faeae6] text-[#bd665c]">
            !
          </div>

          <h2 className="text-xl font-semibold text-[#263a30]">
            Unable to connect
          </h2>

          <p className="mt-3 text-sm leading-relaxed text-[#748377]">
            {error}
          </p>

          <button
            type="button"
            onClick={() => window.location.reload()}
            className="lp-button mt-6"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="lifeprint-app flex h-screen overflow-hidden font-sans">
      <Sidebar />

      <div className="lifeprint-main relative flex min-w-0 flex-1 flex-col overflow-hidden">
        <Header
          title={headerConfig.title}
          subtitle={headerConfig.subtitle}
        />

        <main className="flex-1 overflow-y-auto scroll-smooth px-4 py-6 md:px-8 md:py-8">
          <div className="lifeprint-content">
            {loading ? (
              <div className="flex min-h-[320px] flex-col items-center justify-center gap-5">
                <div className="lifeprint-loading" />

                <p className="text-sm text-[#819084]">
                  Loading your health data...
                </p>
              </div>
            ) : (
              <Outlet />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
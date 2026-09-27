
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  CalendarDays,
  ChartNoAxesCombined,
  Network,
  SlidersHorizontal,
  UserRound,
  Activity,
  ArrowUpRight,
} from 'lucide-react';
import { cn } from '../../lib/utils';

const navItems = [
  { name: 'Overview', path: '/', icon: LayoutDashboard },
  { name: 'Daily Logs', path: '/logs', icon: CalendarDays },
  { name: 'Timeline', path: '/timeline', icon: ChartNoAxesCombined },
  { name: 'Health Graph', path: '/graph', icon: Network },
  { name: 'What-If Simulator', path: '/what-if', icon: SlidersHorizontal },
  { name: 'My Profile', path: '/profile', icon: UserRound },
];

export function Sidebar() {
  return (
    <aside className="hidden h-screen w-[252px] shrink-0 flex-col border-r border-[#E5EBE4] bg-[#FCFDFB] md:flex">
      {/* Brand */}
      <div className="flex h-[88px] shrink-0 items-center gap-3 border-b border-[#EDF0EB] px-6">
        <div className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-[#285943]">
          <Activity
            className="h-[23px] w-[23px] text-white"
            strokeWidth={2.1}
          />
        </div>

        <div className="min-w-0">
          <h1 className="text-[20px] font-semibold tracking-[-0.055em] text-[#233F30]">
            LifePrint
          </h1>

          <p className="mt-0.5 text-[10px] font-medium tracking-[0.045em] text-[#91A096]">
            YOUR HEALTH, IN CONTEXT
          </p>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto px-4 py-7">
        <p className="mb-4 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#9BA89E]">
          Workspace
        </p>

        <nav
          aria-label="Main navigation"
          className="space-y-1.5"
        >
          {navItems.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                cn(
                  'group flex min-h-[46px] items-center gap-3 rounded-xl px-3.5 text-[13px] font-medium transition-all duration-200',
                  isActive
                    ? 'bg-[#E7F0E8] text-[#285943]'
                    : 'text-[#75847A] hover:bg-[#F0F4EF] hover:text-[#285943]'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon
                    className={cn(
                      'h-[18px] w-[18px] shrink-0',
                      isActive
                        ? 'text-[#285943]'
                        : 'text-[#94A398] group-hover:text-[#285943]'
                    )}
                    strokeWidth={isActive ? 2.2 : 1.8}
                  />

                  <span className="flex-1">
                    {item.name}
                  </span>

                  {isActive && (
                    <span className="h-1.5 w-1.5 rounded-full bg-[#477D5C]" />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Small informational panel */}
        <div className="mt-10 rounded-2xl border border-[#DCE8DE] bg-[#F1F6F0] p-4">
          <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-white text-[#477D5C]">
            <Activity className="h-[18px] w-[18px]" />
          </div>

          <h3 className="text-[13px] font-semibold text-[#31543C]">
            Your health, over time
          </h3>

          <p className="mt-2 text-[12px] leading-[1.65] text-[#7B9080]">
            Explore your personal trends, patterns
            and hypothetical scenarios.
          </p>

          <NavLink
            to="/timeline"
            className="mt-4 inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#356B48] hover:text-[#214C32]"
          >
            Explore timeline
            <ArrowUpRight className="h-3.5 w-3.5" />
          </NavLink>
        </div>
      </div>

      {/* Footer */}
      <div className="shrink-0 border-t border-[#EDF0EB] px-6 py-5">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[#73A884]" />

          <span className="text-[11px] font-medium text-[#788A7D]">
            Research prototype
          </span>
        </div>

        <p className="mt-1.5 pl-4 text-[10px] text-[#A1ACA3]">
          LifePrint 2.0
        </p>
      </div>
    </aside>
  );
}

import { NavLink } from 'react-router-dom';
import { useUser } from '../../context/UserContext';
import {
  Activity,
  CalendarDays,
  ChartNoAxesCombined,
  ChevronDown,
  HeartPulse,
  LayoutDashboard,
  Network,
  SlidersHorizontal,
  UserRound,
} from 'lucide-react';

type HeaderProps = {
  title: string;
  subtitle?: string;
};

const mobileNav = [
  { label: 'Overview', path: '/', icon: LayoutDashboard },
  { label: 'Logs', path: '/logs', icon: CalendarDays },
  { label: 'Timeline', path: '/timeline', icon: ChartNoAxesCombined },
  { label: 'Graph', path: '/graph', icon: Network },
  { label: 'What-If', path: '/what-if', icon: SlidersHorizontal },
  { label: 'Profile', path: '/profile', icon: UserRound },
];

export function Header({ title, subtitle }: HeaderProps) {
  const {
    selectedUserId,
    setSelectedUserId,
    availableUsers,
    availableConditions,
    activeConditionId,
    setActiveConditionId,
  } = useUser();

  return (
    <header className="lp-glass sticky top-0 z-30 shrink-0 border-b border-[#E6ECE5]">
      <div className="flex min-h-[88px] items-center justify-between gap-4 px-4 py-4 md:px-8">
        {/* Page heading */}
        <div className="min-w-0">
          <div className="mb-1.5 flex items-center gap-2 md:hidden">
            <Activity className="h-4 w-4 text-[#285943]" />

            <span className="text-xs font-semibold tracking-tight text-[#285943]">
              LifePrint 3.0
            </span>
          </div>

          <h2 className="truncate text-xl font-semibold tracking-[-0.035em] text-[#263D2F] md:text-[25px]">
            {title}
          </h2>

          {subtitle && (
            <p className="mt-1 hidden text-[13px] leading-relaxed text-[#829185] sm:block">
              {subtitle}
            </p>
          )}
        </div>

        {/* Selectors: Condition & User */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Condition Selector */}
          <div className="shrink-0">
            <label
              htmlFor="lifeprint-condition"
              className="mb-1.5 hidden text-[10px] font-semibold uppercase tracking-[0.13em] text-[#9AA69C] md:block"
            >
              Digital Twin Focus
            </label>

            <div className="relative flex items-center gap-2 rounded-xl border border-[#E1E9E0] bg-white/90 px-3 py-2.5 shadow-[0_2px_10px_rgba(39,73,48,0.03)] transition-colors hover:border-[#B7CEBA]">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#E9F1E9]">
                <HeartPulse className="h-3.5 w-3.5 text-[#477C56]" />
              </div>

              <select
                id="lifeprint-condition"
                aria-label="Select digital twin condition"
                value={activeConditionId || 'cardiovascular_bp'}
                onChange={event => setActiveConditionId(event.target.value)}
                disabled={availableConditions.length === 0}
                className="min-w-0 max-w-[130px] sm:max-w-[190px] cursor-pointer appearance-none border-0 bg-transparent pr-5 text-[13px] font-semibold text-[#315440] outline-none focus:ring-0 truncate"
              >
                {availableConditions.map(cond => (
                  <option key={cond.id} value={cond.id}>
                    {cond.name}
                  </option>
                ))}
              </select>

              <ChevronDown className="pointer-events-none absolute right-3 h-3.5 w-3.5 text-[#809584]" />
            </div>
          </div>

          {/* User selector */}
          <div className="shrink-0">
            <label
              htmlFor="lifeprint-user"
              className="mb-1.5 hidden text-[10px] font-semibold uppercase tracking-[0.13em] text-[#9AA69C] md:block"
            >
              Viewing profile
            </label>

            <div className="relative flex min-w-[112px] items-center gap-2 rounded-xl border border-[#E1E9E0] bg-white/90 px-3 py-2.5 shadow-[0_2px_10px_rgba(39,73,48,0.03)] transition-colors hover:border-[#B7CEBA]">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#E9F1E9]">
                <UserRound className="h-3.5 w-3.5 text-[#477C56]" />
              </div>

              <select
                id="lifeprint-user"
                aria-label="Select health profile"
                value={selectedUserId || ''}
                onChange={event =>
                  setSelectedUserId(event.target.value)
                }
                disabled={availableUsers.length === 0}
                className="min-w-0 max-w-[100px] flex-1 cursor-pointer appearance-none border-0 bg-transparent pr-5 text-[13px] font-semibold text-[#315440] outline-none focus:ring-0"
              >
                {availableUsers.length === 0 && (
                  <option value="">No users</option>
                )}

                {availableUsers.map(userId => (
                  <option key={userId} value={userId}>
                    {userId}
                  </option>
                ))}
              </select>

              <ChevronDown className="pointer-events-none absolute right-3 h-3.5 w-3.5 text-[#809584]" />
            </div>
          </div>
        </div>
      </div>

      {/* Mobile navigation */}
      <nav
        aria-label="Mobile navigation"
        className="flex gap-1 overflow-x-auto border-t border-[#E9EEE8] px-3 pb-2 pt-2 md:hidden"
      >
        {mobileNav.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              `flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                isActive
                  ? 'bg-[#E7F0E8] text-[#285943]'
                  : 'text-[#809084] hover:bg-[#F0F4EF]'
              }`
            }
          >
            <item.icon className="h-3.5 w-3.5" />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </header>
  );
}

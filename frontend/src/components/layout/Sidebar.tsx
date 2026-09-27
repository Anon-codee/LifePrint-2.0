import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Calendar, TrendingUp, Network, Calculator, UserCircle, Activity } from 'lucide-react';
import { cn } from '../../lib/utils';

export function Sidebar() {
  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Daily Logs', path: '/logs', icon: Calendar },
    { name: 'Timeline', path: '/timeline', icon: TrendingUp },
    { name: 'Health Graph', path: '/graph', icon: Network },
    { name: 'What-If', path: '/what-if', icon: Calculator },
    { name: 'My Profile', path: '/profile', icon: UserCircle },
  ];

  return (
    <aside className="w-64 border-r border-slate-800 bg-slate-950 flex flex-col h-screen shrink-0 sticky top-0 hidden md:flex">
      <div className="h-16 flex items-center px-6 border-b border-slate-800 shrink-0">
        <Activity className="w-6 h-6 text-blue-500 mr-3" />
        <div>
          <h1 className="font-semibold text-slate-100 leading-none">LifePrint</h1>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">Personal Health Intelligence</p>
        </div>
      </div>
      
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-200",
                isActive 
                  ? "bg-blue-500/10 text-blue-400" 
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
              )
            }
          >
            <item.icon className="w-5 h-5" />
            {item.name}
          </NavLink>
        ))}
      </nav>
      
      <div className="p-4 border-t border-slate-800">
        <div className="text-xs text-slate-500 text-center">
          Prototype Mode
        </div>
      </div>
    </aside>
  );
}

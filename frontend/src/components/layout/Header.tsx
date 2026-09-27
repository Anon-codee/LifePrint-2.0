import { useUser } from '../../context/UserContext';
import { User, ChevronDown } from 'lucide-react';

export function Header({ title, subtitle }: { title: string, subtitle?: string }) {
  const { selectedUserId, setSelectedUserId, availableUsers } = useUser();

  return (
    <header className="h-16 flex items-center justify-between px-8 border-b border-slate-800 bg-slate-950/50 backdrop-blur-md sticky top-0 z-10 shrink-0">
      <div>
        <h2 className="text-xl font-medium text-slate-100">{title}</h2>
        {subtitle && <p className="text-sm text-slate-400">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-4">
        <div className="relative group">
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-full cursor-pointer hover:bg-slate-800 transition-colors">
            <User className="w-4 h-4 text-slate-400" />
            <select 
              className="bg-transparent text-sm font-medium text-slate-200 outline-none appearance-none pr-4 cursor-pointer"
              value={selectedUserId || ''}
              onChange={(e) => setSelectedUserId(e.target.value)}
            >
              {availableUsers.map(u => (
                <option key={u} value={u} className="bg-slate-900">{u}</option>
              ))}
            </select>
            <ChevronDown className="w-3 h-3 text-slate-500 absolute right-3 pointer-events-none" />
          </div>
        </div>
      </div>
    </header>
  );
}

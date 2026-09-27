import { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api/client';

interface UserContextType {
  selectedUserId: string | null;
  setSelectedUserId: (id: string) => void;
  availableUsers: string[];
  loading: boolean;
  error: string | null;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [availableUsers, setAvailableUsers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchUsers() {
      try {
        const data = await api.getUsers();
        const userIds = data.users.map((u: any) => u.user_id);
        setAvailableUsers(userIds);
        if (userIds.length > 0) {
          setSelectedUserId((prev) => prev ? prev : userIds[0]);
        }
      } catch (err: any) {
        console.error(err);
        setError("LifePrint can't reach the health intelligence service. Check that the backend is running.");
      } finally {
        setLoading(false);
      }
    }
    fetchUsers();
  }, []);

  return (
    <UserContext.Provider value={{ selectedUserId, setSelectedUserId, availableUsers, loading, error }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}

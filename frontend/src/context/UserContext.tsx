import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';

export interface ConditionInfo {
  id: string;
  name: string;
  tagline?: string;
  description: string;
  primary_signals: string[];
  supporting_signals?: string[];
  target_outcomes: string[];
  disclaimer?: string;
}

interface UserContextType {
  selectedUserId: string | null;
  setSelectedUserId: (id: string) => void;
  availableUsers: string[];
  availableConditions: ConditionInfo[];
  activeConditionId: string | null;
  activeCondition: ConditionInfo | null;
  setActiveConditionId: (id: string) => Promise<void>;
  twinStatus: any | null;
  loadingTwinStatus: boolean;
  refreshTwinStatus: () => Promise<void>;
  loading: boolean;
  error: string | null;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [availableUsers, setAvailableUsers] = useState<string[]>([]);
  const [availableConditions, setAvailableConditions] = useState<ConditionInfo[]>([]);
  const [activeConditionId, setActiveConditionIdState] = useState<string | null>('cardiovascular_bp');
  const [activeCondition, setActiveCondition] = useState<ConditionInfo | null>(null);
  const [twinStatus, setTwinStatus] = useState<any | null>(null);
  const [loadingTwinStatus, setLoadingTwinStatus] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initial fetch for users and conditions
  useEffect(() => {
    async function init() {
      try {
        const [usersData, conditionsData] = await Promise.all([
          api.getUsers(),
          api.getConditions().catch(() => ({ conditions: [] })),
        ]);

        const userIds = usersData.users.map((u: any) => u.user_id);
        setAvailableUsers(userIds);
        if (userIds.length > 0) {
          setSelectedUserId((prev) => (prev ? prev : userIds[0]));
        }

        const conditionsList: ConditionInfo[] = conditionsData.conditions || [];
        setAvailableConditions(conditionsList);
      } catch (err: any) {
        console.error(err);
        setError("LifePrint can't reach the health intelligence service. Check that the backend is running.");
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  // Fetch twin status and active condition when selectedUserId changes
  const fetchTwinData = useCallback(async (userId: string) => {
    setLoadingTwinStatus(true);
    try {
      const [condRes, twinRes] = await Promise.all([
        api.getUserCondition(userId).catch(() => null),
        api.getTwinStatus(userId).catch(() => null),
      ]);

      if (condRes && condRes.active_condition_id) {
        setActiveConditionIdState(condRes.active_condition_id);
        setActiveCondition(condRes.condition || null);
      }
      setTwinStatus(twinRes);
    } catch (err) {
      console.error('Failed to fetch condition twin data:', err);
    } finally {
      setLoadingTwinStatus(false);
    }
  }, []);

  useEffect(() => {
    if (selectedUserId) {
      fetchTwinData(selectedUserId);
    }
  }, [selectedUserId, fetchTwinData]);

  const setActiveConditionId = async (newConditionId: string) => {
    if (!selectedUserId) return;
    try {
      setLoadingTwinStatus(true);
      await api.setUserCondition(selectedUserId, { condition_id: newConditionId });
      await fetchTwinData(selectedUserId);
    } catch (err) {
      console.error('Failed to update active condition:', err);
    } finally {
      setLoadingTwinStatus(false);
    }
  };

  const refreshTwinStatus = async () => {
    if (selectedUserId) {
      await fetchTwinData(selectedUserId);
    }
  };

  return (
    <UserContext.Provider
      value={{
        selectedUserId,
        setSelectedUserId,
        availableUsers,
        availableConditions,
        activeConditionId,
        activeCondition,
        setActiveConditionId,
        twinStatus,
        loadingTwinStatus,
        refreshTwinStatus,
        loading,
        error,
      }}
    >
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

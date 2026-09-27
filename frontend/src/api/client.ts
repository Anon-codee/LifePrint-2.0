import axios from 'axios';

const API_URL =
  import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

export const apiClient = axios.create({
  baseURL: API_URL,
});

export const api = {
  getUsers: async () => {
    const res = await apiClient.get('/api/users');
    return res.data;
  },
  getUserProfile: async (userId: string) => {
    const res = await apiClient.get(`/api/users/${userId}`);
    return res.data;
  },
  getTodayHealth: async (userId: string) => {
  const res = await apiClient.get(
    `/api/users/${userId}/today-v2`
  );

  return res.data;
  },
  getBaseline: async (userId: string) => {
    const res = await apiClient.get(`/api/users/${userId}/baseline`);
    return res.data;
  },
  getPatterns: async (userId: string) => {
    const res = await apiClient.get(`/api/users/${userId}/patterns`);
    return res.data;
  },
  getPrediction: async (userId: string) => {
    const res = await apiClient.get(`/api/users/${userId}/prediction`);
    return res.data;
  },
  getPredictionExplanation: async (userId: string) => {
    const res = await apiClient.get(`/api/users/${userId}/prediction/explanation`);
    return res.data;
  },
  getGraph: async (userId: string) => {
    const res = await apiClient.get(`/api/users/${userId}/graph`);
    return res.data;
  },
  getGraphV2: async (userId: string) => {
  const res = await apiClient.get(
    `/api/users/${userId}/graph-v2`
  );
  return res.data;
  },
  getTimeline: async (userId: string) => {
    const res = await apiClient.get(`/api/users/${userId}/timeline`);
    return res.data;
  },
  simulateWhatIf: async (userId: string, data: any) => {
    const res = await apiClient.post(`/api/users/${userId}/what-if`, data);
    return res.data;
  },
  simulateWhatIfV2: async (
  userId: string,
  data: {
    sleep_hours: number;
    hydration_liters: number;
    stress: number;
    activity_steps: number;
    caffeine: number;
  }
) => {
  const response = await apiClient.post(
    `/api/users/${userId}/what-if-v2`,
    data
  );

  return response.data;
},
};

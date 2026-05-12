import axios from 'axios';

const BASE_URL = 'https://us-central1-yau-app.cloudfunctions.net/apis';

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface Coach {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  primarySport: string;
  secondarySports?: string[];
  experience?: string;
  hourlyRate?: number;
  status: 'pending' | 'approved' | 'rejected';
  isActive: boolean;
  assignedTeams?: any[];
  location?: string;
  createdAt: string;
  updatedAt: string;
}

export const coachService = {
  getCoaches: async (): Promise<Coach[]> => {
    const response = await api.get('/coaches');
    return response.data.data;
  },

  getCoachById: async (id: string): Promise<Coach> => {
    const response = await api.get(`/coaches/${id}`);
    return response.data.data;
  },

  createCoach: async (coachData: Partial<Coach>) => {
    const response = await api.post('/coaches', coachData);
    return response.data;
  },

  updateCoach: async (id: string, coachData: Partial<Coach>) => {
    const response = await api.put(`/coaches/${id}`, coachData);
    return response.data;
  },

  deleteCoach: async (id: string) => {
    const response = await api.delete(`/coaches/${id}`);
    return response.data;
  },
};

export interface UniformOrder {
  id: string;
  studentId: string;
  studentName: string;
  parentId: string;
  parentName: string;
  team: string;
  ageGroup: string;
  uniformTop: string;
  uniformBottom: string;
  paymentStatus: string;
  received: boolean;
  orderDate: string;
  notes?: string;
}

export const uniformService = {
  getOrders: async (filters: any = {}): Promise<UniformOrder[]> => {
    const response = await api.get('/uniforms', { params: filters });
    return response.data.uniforms || [];
  },

  updateStatus: async (orderId: string, received: boolean) => {
    const response = await api.put(`/uniforms/${orderId}/received`, { received });
    return response.data;
  },

  getSummary: async () => {
    const response = await api.get('/uniforms/summary');
    return response.data;
  }
};

export const platformService = {
  getSettings: async () => {
    const response = await api.get('/settings');
    return response.data;
  },
  updateSettings: async (settings: any) => {
    const response = await api.put('/settings', settings);
    return response.data;
  }
};

export const memberService = {
  getMembers: async () => {
    const response = await api.get('/members');
    return response.data.data || [];
  },
  createMember: async (memberData: any) => {
    const response = await api.post('/members', memberData);
    return response.data;
  },
  updateMember: async (id: string, updates: any) => {
    const response = await api.put(`/members/${id}`, updates);
    return response.data;
  },
  deleteMember: async (id: string) => {
    const response = await api.delete(`/members/${id}`);
    return response.data;
  }
};

export const adminService = {
  getAdmins: async (token: string) => {
    const response = await api.get('/admins', {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data.data?.admins || [];
  },
  createAdmin: async (adminData: any, token: string) => {
    const response = await api.post('/admins', adminData, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },
  updateAdmin: async (id: string, updates: any, token: string) => {
    const response = await api.put(`/admins/${id}`, updates, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },
  deleteAdmin: async (id: string, token: string) => {
    const response = await api.delete(`/admins/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  }
};

export default api;
/**
 * Strongly-Typed REST API Client Helper for Level 3 Integration & E2E Testing
 * Reference: PROJECT.md § Interface Contracts, TEST_INFRA.md
 */

export interface ApiResponse<T = any> {
  status: number;
  ok: boolean;
  data?: T;
  error?: string;
  headers?: Headers;
}

export class TestApiClient {
  private baseURL: string;

  constructor(baseURL?: string) {
    this.baseURL = baseURL || process.env.BASE_URL || 'http://localhost:3000';
  }

  private async request<T = any>(
    endpoint: string,
    options: RequestInit = {},
    token?: string
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    const headers = new Headers(options.headers || {});

    if (!headers.has('Content-Type') && options.body) {
      headers.set('Content-Type', 'application/json');
    }

    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
      headers.set('Cookie', `token=${token}`);
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      let data: any;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      return {
        status: response.status,
        ok: response.ok,
        data: response.ok ? data : undefined,
        error: !response.ok ? (typeof data === 'object' ? data?.error || data?.message : data) : undefined,
        headers: response.headers,
      };
    } catch (err: any) {
      return {
        status: 0,
        ok: false,
        error: err.message || 'Network request failed',
      };
    }
  }

  // --- Auth Endpoints ---
  auth = {
    register: (body: { email: string; password: string; name: string }) =>
      this.request('/api/auth/register', { method: 'POST', body: JSON.stringify(body) }),

    login: (body: { email: string; password: string }) =>
      this.request('/api/auth/login', { method: 'POST', body: JSON.stringify(body) }),

    me: (token?: string) =>
      this.request('/api/auth/me', { method: 'GET' }, token),

    logout: (token?: string) =>
      this.request('/api/auth/logout', { method: 'POST' }, token),
  };

  // --- User & Plan Endpoints ---
  user = {
    getStats: (token?: string) =>
      this.request('/api/user/stats', { method: 'GET' }, token),

    updatePlan: (
      body: { examDate: string; weeklyHours: number; targetScore: number; mode: 'standard' | 'fast-track' },
      token?: string
    ) =>
      this.request('/api/user/plan', { method: 'PUT', body: JSON.stringify(body) }, token),
  };

  // --- Curriculum Endpoints ---
  curriculum = {
    getSections: (token?: string) =>
      this.request('/api/curriculum/sections', { method: 'GET' }, token),

    getUnits: (sectionId?: string, token?: string) => {
      const query = sectionId ? `?sectionId=${encodeURIComponent(sectionId)}` : '';
      return this.request(`/api/curriculum/units${query}`, { method: 'GET' }, token);
    },

    getSubunits: (unitId?: string, token?: string) => {
      const query = unitId ? `?unitId=${encodeURIComponent(unitId)}` : '';
      return this.request(`/api/curriculum/subunits${query}`, { method: 'GET' }, token);
    },
  };

  // --- Quiz Endpoints ---
  quiz = {
    startSession: (
      body: { subunitIds: string[]; count: number; mode: 'practice' | 'exam' },
      token?: string
    ) =>
      this.request('/api/quiz/questions', { method: 'POST', body: JSON.stringify(body) }, token),

    submitAnswer: (
      body: { sessionId: string; questionId: string; selectedOption: string; timeSpentSeconds: number },
      token?: string
    ) =>
      this.request('/api/quiz/submit', { method: 'POST', body: JSON.stringify(body) }, token),
  };

  // --- Spaced Repetition (SRS) Endpoints ---
  srs = {
    getDueCards: (token?: string) =>
      this.request('/api/srs/due', { method: 'GET' }, token),

    reviewCard: (
      body: { cardId: string; rating: 1 | 2 | 3 | 4; timeSpentSeconds: number },
      token?: string
    ) =>
      this.request('/api/srs/review', { method: 'POST', body: JSON.stringify(body) }, token),

    undoReview: (body: { undoToken: string }, token?: string) =>
      this.request('/api/srs/undo', { method: 'POST', body: JSON.stringify(body) }, token),
  };

  // --- Exam Simulation Endpoints ---
  exam = {
    getMocks: (token?: string) =>
      this.request('/api/exam/mocks', { method: 'GET' }, token),

    startExam: (body: { mockId: string }, token?: string) =>
      this.request('/api/exam/start', { method: 'POST', body: JSON.stringify(body) }, token),

    submitExam: (
      body: { examSessionId: string; answers: Record<string, string> },
      token?: string
    ) =>
      this.request('/api/exam/submit', { method: 'POST', body: JSON.stringify(body) }, token),
  };

  // --- Formulas Endpoints ---
  formulas = {
    search: (query?: { query?: string; section?: string }, token?: string) => {
      const params = new URLSearchParams();
      if (query?.query) params.append('query', query.query);
      if (query?.section) params.append('section', query.section);
      const qs = params.toString() ? `?${params.toString()}` : '';
      return this.request(`/api/formulas${qs}`, { method: 'GET' }, token);
    },
  };
}

export const apiClient = new TestApiClient();

import axios, { AxiosError } from 'axios';
import { toast } from 'sonner';

// Base API configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.ultimatehackathon.eu';

// Create axios instance with default config
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ error?: string; message?: string }>) => {
    const errorMessage = error.response?.data?.message || error.message || 'An unexpected error occurred';
    
    // Show toast for API errors (can be disabled per-request)
    if (!error.config?.headers?.['X-No-Toast']) {
      toast.error(errorMessage);
    }
    
    return Promise.reject(error);
  }
);

// Type definitions matching backend DTOs
export type HackathonStatus = 'DRAFT' | 'OPEN' | 'CLOSED' | 'CANCELLED';

export interface HackathonResponse {
  id: number;
  name: string;
  description: string;
  location: string;
  startDate: string;
  endDate: string;
  status: HackathonStatus;
}

export interface HackathonAdminResponse extends HackathonResponse {
  slug: string;
  requireApproval: boolean;
  allowTeamCreation: boolean;
  bannerUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface HackathonCreateRequest {
  name: string;
  description: string;
  location: string;
  startDate: string;
  endDate: string;
  requireApproval?: boolean;
  allowTeamCreation?: boolean;
  bannerUrl?: string;
}

export interface HackathonUpdateRequest {
  name: string;
  description: string;
  location: string;
  startDate: string;
  endDate: string;
  status: HackathonStatus;
}

export interface ParticipantDto {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  data: Record<string, unknown>;
}

export interface TeamMemberDTO {
  participantId: number;
  role: string;
  skills: string;
  motivation: number;
  yearsExperience: number;
}

export interface TeamDTO {
  id: string;
  name: string;
  score: number | null;
  generationId: string;
  createdAt: string;
  members: TeamMemberDTO[];
}

export interface ValidationError {
  rowNumber: number;
  columnNumber: number | null;
  key: string;
  header: string;
  code: string;
  value: unknown;
}

export interface TopError {
  code: string;
  count: number;
}

export interface ValidationReport {
  batchPreviewId: string;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  topErrorCodes: TopError[];
  errors: ValidationError[];
}

export interface ImportSummary {
  total: number;
  inserted: number;
  updated: number;
  skipped: number;
  deduped: number;
}

export interface ImportRequest {
  batchPreviewId: string;
  hackathonId: number;
}

export interface HealthResponse {
  status: string;
  timestamp: string;
}

export const healthApi = {
  check: () => apiClient.get<HealthResponse>('/api/health'),
};

export const hackathonApi = {
  getAll: () => apiClient.get<HackathonResponse[]>('/api/hackathons'),
  getById: (id: number) => apiClient.get<HackathonResponse>(`/api/hackathons/${id}`),
};

export const adminHackathonApi = {
  getAll: () => apiClient.get<HackathonAdminResponse[]>('/api/admin/hackathons'),
  getById: (id: number) => apiClient.get<HackathonAdminResponse>(`/api/admin/hackathons/${id}`),
  create: (data: HackathonCreateRequest) => 
    apiClient.post<HackathonAdminResponse>('/api/admin/hackathons', data),
  update: (id: number, data: HackathonUpdateRequest) => 
    apiClient.put<HackathonAdminResponse>(`/api/admin/hackathons/${id}`, data),
  delete: (id: number) => apiClient.delete(`/api/admin/hackathons/${id}`),
};

export const participantApi = {
  getAll: () => apiClient.get<ParticipantDto[]>('/api/participants/all'),
};

export const teamApi = {
  generate: (hackathonId: number, teamSize: number) =>
    apiClient.post<{ generationId: string; message: string }>(
      `/api/teams/${hackathonId}/generate?teamSize=${teamSize}`
    ),
  getTeams: (generationId?: string) =>
    apiClient.get<TeamDTO[]>('/api/teams', {
      params: generationId ? { generationId } : undefined,
    }),
  rename: (teamId: string, name: string) =>
    apiClient.patch<TeamDTO>(`/api/teams/${teamId}`, { name }),
  addMembers: (teamId: string, participantIds: number[]) =>
    apiClient.post<TeamDTO>(`/api/teams/${teamId}/members`, { participantIds }),
  removeMember: (teamId: string, participantId: number) =>
    apiClient.delete<TeamDTO>(`/api/teams/${teamId}/members/${participantId}`),
  moveMember: (participantId: number, targetTeamId: string) =>
    apiClient.post('/api/teams/move-member', { participantId, targetTeamId }),
};

export const uploadApi = {
  validate: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post<ValidationReport>('/api/upload/validate', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  import: (batchPreviewId: string, hackathonId: number) =>
    apiClient.post<ImportSummary>('/api/upload/import', { batchPreviewId, hackathonId }),
};

export const questionnaireApi = {
  get: (hackathonId: number) =>
    apiClient.get<unknown>(`/api/hackathons/${hackathonId}/questionnaire`),
  submit: (hackathonId: number, questionnaireId: number, participantId: number, answers: unknown) =>
    apiClient.post(`/api/hackathons/${hackathonId}/questionnaire/submit`, {
      questionnaireId,
      participantId,
      answers,
    }),
};

export const adminQuestionnaireApi = {
  get: (hackathonId: number) =>
    apiClient.get<unknown>(`/api/admin/hackathons/${hackathonId}/questionnaire`),
  saveInternal: (hackathonId: number, questionnaire: unknown) =>
    apiClient.put<unknown>(`/api/admin/hackathons/${hackathonId}/questionnaire/internal`, questionnaire),
  publish: (hackathonId: number) =>
    apiClient.post(`/api/admin/hackathons/${hackathonId}/questionnaire/publish`),
  edit: (hackathonId: number, questionnaireId: number, questionnaire: unknown) =>
    apiClient.post<unknown>(
      `/api/admin/hackathons/${hackathonId}/questionnaire/edit/${questionnaireId}`,
      questionnaire
    ),
};

export default apiClient;


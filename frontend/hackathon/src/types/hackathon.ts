// Backend DTOs (matching API.md)
export interface ParticipantDto {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  data: {
    first_name?: string;
    last_name?: string;
    email?: string;
    role?: string;
    gender?: string;
    education?: string;
    motivation?: number;
    age?: number;
    years_experience?: number;
    skills?: string[];
    field_of_interest?: string;
    hasTeam?: string;
    willPresentIdea?: string;
    ideaName?: string;
    problem?: string;
    [key: string]: unknown;
  };
}

// Frontend Participant (transformed from DTO)
export interface Participant {
  id: string;
  name: string;
  email: string;
  motivation: number;
  skills: string[];
  idea?: boolean;
  ideaName?: string;
  fieldOfInterest?: string;
  role?: string;
  age?: number;
  gender?: string;
  education?: string;
  yearsExperience?: number;
  hasTeam?: boolean;
  problem?: string;
}

// Backend Hackathon Status
export type HackathonStatus = 'DRAFT' | 'OPEN' | 'CLOSED' | 'CANCELLED';

// Frontend status mapping for backwards compatibility
export type LegacyHackathonStatus = 'upcoming' | 'active' | 'completed';

// Backend Hackathon Response (from /api/hackathons)
export interface HackathonResponse {
  id: number;
  name: string;
  description: string;
  location: string;
  startDate: string;
  endDate: string;
  status: HackathonStatus;
}

// Backend Admin Hackathon Response (from /api/admin/hackathons)
export interface HackathonAdminResponse extends HackathonResponse {
  slug: string;
  requireApproval: boolean;
  allowTeamCreation: boolean;
  bannerUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

// Frontend Hackathon (enriched with participants for local state)
export interface Hackathon {
  id: string;
  name: string;
  description: string;
  startDate: Date;
  endDate: Date;
  location: string;
  status: HackathonStatus;
  participants: Participant[];
  // Legacy fields for backwards compatibility
  theme?: string;
  maxParticipants?: number;
  // Admin fields
  slug?: string;
  requireApproval?: boolean;
  allowTeamCreation?: boolean;
  bannerUrl?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

// Create/Update request types
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

// Team types (matching backend TeamDTO)
export interface TeamMember {
  participantId: number;
  role: string;
  skills: string;
  motivation: number;
  yearsExperience: number;
}

export interface Team {
  id: string;
  name: string;
  score: number | null;
  generationId: string;
  createdAt: string;
  members: TeamMember[];
}

// Validation/Import types
export interface ValidationError {
  rowNumber: number;
  columnNumber: number | null;
  key: string;
  header: string;
  code: string;
  value: unknown;
}

export interface ValidationReport {
  batchPreviewId: string;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  topErrorCodes: { code: string; count: number }[];
  errors: ValidationError[];
}

export interface ImportSummary {
  total: number;
  inserted: number;
  updated: number;
  skipped: number;
  deduped: number;
}

// Utility functions for type conversion
export function mapHackathonResponseToHackathon(
  response: HackathonResponse | HackathonAdminResponse
): Hackathon {
  const adminResponse = response as HackathonAdminResponse;
  return {
    id: String(response.id),
    name: response.name,
    description: response.description,
    location: response.location,
    startDate: new Date(response.startDate),
    endDate: new Date(response.endDate),
    status: response.status,
    participants: [],
    // Admin fields (if available)
    slug: adminResponse.slug,
    requireApproval: adminResponse.requireApproval,
    allowTeamCreation: adminResponse.allowTeamCreation,
    bannerUrl: adminResponse.bannerUrl,
    createdAt: adminResponse.createdAt ? new Date(adminResponse.createdAt) : undefined,
    updatedAt: adminResponse.updatedAt ? new Date(adminResponse.updatedAt) : undefined,
  };
}

export function mapParticipantDtoToParticipant(dto: ParticipantDto): Participant {
  const data = dto.data || {};
  const skills = Array.isArray(data.skills)
    ? data.skills.map((s) => String(s))
    : [];

  return {
    id: String(dto.id),
    name: [dto.firstName, dto.lastName].filter(Boolean).join(' ').trim() || dto.email,
    email: dto.email,
    motivation: data.motivation ?? 0,
    skills,
    idea: data.willPresentIdea === 'Yes' || data.willPresentIdea === 'true',
    ideaName: data.ideaName,
    fieldOfInterest: data.field_of_interest,
    role: data.role,
    age: data.age,
    gender: data.gender,
    education: data.education,
    yearsExperience: data.years_experience,
    hasTeam: data.hasTeam === 'Yes' || data.hasTeam === 'true',
    problem: data.problem,
  };
}

// Status helper for UI display
export function getStatusDisplayInfo(status: HackathonStatus): {
  label: string;
  className: string;
} {
  switch (status) {
    case 'DRAFT':
      return {
        label: 'Draft',
        className: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
      };
    case 'OPEN':
      return {
        label: 'Open',
        className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      };
    case 'CLOSED':
      return {
        label: 'Closed',
        className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      };
    case 'CANCELLED':
      return {
        label: 'Cancelled',
        className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      };
    default:
      return {
        label: status,
        className: 'bg-gray-100 text-gray-800',
      };
  }
}

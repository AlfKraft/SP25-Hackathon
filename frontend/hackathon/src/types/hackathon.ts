export interface ParticipantDto {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  data: {
    first_name: string;
    last_name: string;
    email: string;
    role: string;
    gender: string;
    education: string;
    motivation: number;
    age: number;
    years_experience: number;
    skills: string[];
    field_of_interest?: string;
    hasTeam?: string;
    willPresentIdea?: string;
    ideaName?: string;
    problem?: string;
  };
}

export interface Participant {
  id: string;
  name: string;
  email: string;
  motivation: number;
  skills: string[];
  idea: boolean;
  ideaName: string;
  // Additional fields from data
  fieldOfInterest?: string;
  role?: string;
  age?: number;
  gender?: string;
  education?: string;
  yearsExperience?: number;
  hasTeam?: boolean;
  problem?: string;
}

export interface Hackathon {
  id: string;
  name: string;
  description: string;
  startDate: Date;
  endDate: Date;
  location: string;
  theme: string;
  participants: Participant[];
  maxParticipants: number;
  status: 'upcoming' | 'active' | 'completed';
}

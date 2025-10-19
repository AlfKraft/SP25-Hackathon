export interface Participant {
  id: string;
  name: string;
  email: string;
  motivation: string;
  skills: string[];
  idea: boolean;
  ideaName: string;
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

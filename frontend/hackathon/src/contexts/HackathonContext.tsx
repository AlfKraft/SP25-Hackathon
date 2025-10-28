import React, { createContext, useContext, useState} from 'react';
import type {ReactNode} from 'react';
import type { Hackathon, Participant } from '@/types/hackathon';

interface HackathonContextType {
  hackathons: Hackathon[];
  currentHackathon: Hackathon | null;
  setCurrentHackathon: (hackathon: Hackathon) => void;
  addParticipant: (participant: Omit<Participant, 'id' | 'joinedAt'>) => void;
  removeParticipant: (participantId: string) => void;
  updateParticipant: (participantId: string, updates: Partial<Participant>) => void;
  createHackathon: (hackathon: Omit<Hackathon, 'id' | 'participants'>) => void;
  replaceCurrentHackathonParticipants: (participants: Participant[]) => void;
}

const HackathonContext = createContext<HackathonContextType | undefined>(undefined);

export const useHackathon = () => {
  const context = useContext(HackathonContext);
  if (!context) {
    throw new Error('useHackathon must be used within a HackathonProvider');
  }
  return context;
};

interface HackathonProviderProps {
  children: ReactNode;
}

export const HackathonProvider: React.FC<HackathonProviderProps> = ({ children }) => {
  // Sample hackathon data
  const [hackathons, setHackathons] = useState<Hackathon[]>([
    {
      id: '1',
      name: 'AI Innovation Challenge',
      description: 'Build AI-powered solutions for real-world problems',
      startDate: new Date('2024-02-15'),
      endDate: new Date('2024-02-17'),
      location: 'San Francisco, CA',
      theme: 'Artificial Intelligence',
      maxParticipants: 100,
      status: 'upcoming',
      participants: [
        
      ]
    },
    {
      id: '2',
      name: 'Green Tech Hackathon',
      description: 'Develop sustainable technology solutions',
      startDate: new Date('2024-03-01'),
      endDate: new Date('2024-03-03'),
      location: 'Austin, TX',
      theme: 'Sustainability',
      maxParticipants: 80,
      status: 'upcoming',
      participants: [
        {
          id: 'p3',
          name: 'Carol Davis',
          email: 'carol@example.com',
          motivation: 0,
          idea: true,
          ideaName: 'Sustainable Technology Solution',
          skills: ['Product Management', 'Strategy', 'Analytics']
        }
      ]
    },
    {
      id: '3',
      name: 'FinTech Revolution',
      description: 'Innovate financial technology solutions',
      startDate: new Date('2024-01-10'),
      endDate: new Date('2024-01-12'),
      location: 'New York, NY',
      theme: 'Financial Technology',
      maxParticipants: 120,
      status: 'completed',
      participants: [
        {
          id: 'p4',
          name: 'David Wilson',
          email: 'david@example.com',
          motivation: 0,
          idea: true,
          ideaName: 'Sustainable Technology Solution',
          skills: ['Blockchain', 'Solidity', 'Web3'],
        },
        {
          id: 'p5',
          name: 'Eva Brown',
          email: 'eva@example.com',
          motivation: 0,
          idea: false,
          ideaName: 'Sustainable Technology Solution',
          skills: ['Design Systems', 'Accessibility', 'Mobile Design'],
        }
      ]
    }
  ]);

  const [currentHackathon, setCurrentHackathon] = useState<Hackathon | null>(hackathons[0]);

  const addParticipant = (participantData: Omit<Participant, 'id' | 'joinedAt'>) => {
    if (!currentHackathon) return;

    const newParticipant: Participant = {
      ...participantData,
      id: `p${Date.now()}`,
    };

    setHackathons(prev => prev.map(hackathon => 
      hackathon.id === currentHackathon.id 
        ? { ...hackathon, participants: [...hackathon.participants, newParticipant] }
        : hackathon
    ));

    setCurrentHackathon(prev => prev ? {
      ...prev,
      participants: [...prev.participants, newParticipant]
    } : null);
  };

  const removeParticipant = (participantId: string) => {
    if (!currentHackathon) return;

    setHackathons(prev => prev.map(hackathon => 
      hackathon.id === currentHackathon.id 
        ? { ...hackathon, participants: hackathon.participants.filter(p => p.id !== participantId) }
        : hackathon
    ));

    setCurrentHackathon(prev => prev ? {
      ...prev,
      participants: prev.participants.filter(p => p.id !== participantId)
    } : null);
  };

  const updateParticipant = (participantId: string, updates: Partial<Participant>) => {
    if (!currentHackathon) return;

    setHackathons(prev => prev.map(hackathon => 
      hackathon.id === currentHackathon.id 
        ? { 
            ...hackathon, 
            participants: hackathon.participants.map(p => 
              p.id === participantId ? { ...p, ...updates } : p
            )
          }
        : hackathon
    ));

    setCurrentHackathon(prev => prev ? {
      ...prev,
      participants: prev.participants.map(p => 
        p.id === participantId ? { ...p, ...updates } : p
      )
    } : null);
  };

  const createHackathon = (hackathonData: Omit<Hackathon, 'id' | 'participants'>) => {
    const newHackathon: Hackathon = {
      ...hackathonData,
      id: `h${Date.now()}`,
      participants: []
    };

    setHackathons(prev => [...prev, newHackathon]);
  };

  const replaceCurrentHackathonParticipants = (participants: Participant[]) => {
    if (!currentHackathon) return;

    setHackathons(prev => prev.map(hackathon =>
      hackathon.id === currentHackathon.id
        ? { ...hackathon, participants }
        : hackathon
    ));

    setCurrentHackathon(prev => prev ? { ...prev, participants } as Hackathon : null as any);
  };

  const value: HackathonContextType = {
    hackathons,
    currentHackathon,
    setCurrentHackathon,
    addParticipant,
    removeParticipant,
    updateParticipant,
    createHackathon
    ,
    replaceCurrentHackathonParticipants
  };

  return (
    <HackathonContext.Provider value={value}>
      {children}
    </HackathonContext.Provider>
  );
};

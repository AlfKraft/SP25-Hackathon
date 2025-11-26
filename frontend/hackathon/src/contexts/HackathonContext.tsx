import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { 
  Hackathon, 
  Participant, 
  HackathonCreateRequest,
  HackathonUpdateRequest,
  HackathonStatus 
} from '@/types/hackathon';
import { 
  mapHackathonResponseToHackathon, 
  mapParticipantDtoToParticipant 
} from '@/types/hackathon';
import { 
  adminHackathonApi, 
  participantApi 
} from '@/services/api';
import { toast } from 'sonner';

interface HackathonContextType {
  // Data
  hackathons: Hackathon[];
  currentHackathon: Hackathon | null;
  
  // Loading/Error states
  isLoading: boolean;
  isLoadingParticipants: boolean;
  error: string | null;
  
  // Actions
  setCurrentHackathon: (hackathon: Hackathon) => void;
  selectHackathonById: (id: string) => void;
  refreshHackathons: () => Promise<void>;
  refreshParticipants: () => Promise<void>;
  
  // Participant actions
  addParticipant: (participant: Omit<Participant, 'id'>) => void;
  removeParticipant: (participantId: string) => void;
  updateParticipant: (participantId: string, updates: Partial<Participant>) => void;
  replaceCurrentHackathonParticipants: (participants: Participant[]) => void;
  
  // Hackathon CRUD
  createHackathon: (hackathon: HackathonCreateRequest) => Promise<Hackathon | null>;
  updateHackathon: (id: string, updates: HackathonUpdateRequest) => Promise<Hackathon | null>;
  deleteHackathon: (id: string) => Promise<boolean>;
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
  const [hackathons, setHackathons] = useState<Hackathon[]>([]);
  const [currentHackathon, setCurrentHackathonState] = useState<Hackathon | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingParticipants, setIsLoadingParticipants] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch hackathons from API
  const refreshHackathons = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await adminHackathonApi.getAll();
      const fetchedHackathons = response.data.map(mapHackathonResponseToHackathon);
      setHackathons(fetchedHackathons);
      
      // If no current hackathon is selected, select the first one
      if (!currentHackathon && fetchedHackathons.length > 0) {
        setCurrentHackathonState(fetchedHackathons[0]);
      } else if (currentHackathon) {
        // Update current hackathon with fresh data
        const updated = fetchedHackathons.find(h => h.id === currentHackathon.id);
        if (updated) {
          setCurrentHackathonState({
            ...updated,
            participants: currentHackathon.participants, // Preserve participants
          });
        }
      }
    } catch (err) {
      console.error('Failed to fetch hackathons:', err);
      setError('Failed to load hackathons. Please try again.');
      
      // Fallback to sample data if API fails
      const fallbackHackathons: Hackathon[] = [
        {
          id: '1',
          name: 'Sample Hackathon (Offline)',
          description: 'Unable to connect to server. This is sample data.',
          startDate: new Date(),
          endDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
          location: 'Online',
          status: 'OPEN' as HackathonStatus,
          participants: [],
        },
      ];
      setHackathons(fallbackHackathons);
      if (!currentHackathon) {
        setCurrentHackathonState(fallbackHackathons[0]);
      }
    } finally {
      setIsLoading(false);
    }
  }, [currentHackathon]);

  // Fetch participants for current hackathon
  const refreshParticipants = useCallback(async () => {
    if (!currentHackathon) return;
    
    setIsLoadingParticipants(true);
    
    try {
      const response = await participantApi.getAll();
      const participants = response.data.map(mapParticipantDtoToParticipant);
      
      // Update current hackathon with participants
      setCurrentHackathonState(prev => prev ? { ...prev, participants } : null);
      
      // Also update in the hackathons list
      setHackathons(prev => prev.map(h => 
        h.id === currentHackathon.id ? { ...h, participants } : h
      ));
    } catch (err) {
      console.error('Failed to fetch participants:', err);
      toast.error('Failed to load participants');
    } finally {
      setIsLoadingParticipants(false);
    }
  }, [currentHackathon]);

  // Initial load
  useEffect(() => {
    refreshHackathons();
  }, []);

  // Set current hackathon
  const setCurrentHackathon = useCallback((hackathon: Hackathon) => {
    setCurrentHackathonState(hackathon);
  }, []);

  // Select hackathon by ID
  const selectHackathonById = useCallback((id: string) => {
    const hackathon = hackathons.find(h => h.id === id);
    if (hackathon) {
      setCurrentHackathonState(hackathon);
    }
  }, [hackathons]);

  // Add participant locally
  const addParticipant = useCallback((participantData: Omit<Participant, 'id'>) => {
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

    setCurrentHackathonState(prev => prev ? {
      ...prev,
      participants: [...prev.participants, newParticipant]
    } : null);
  }, [currentHackathon]);

  // Remove participant locally
  const removeParticipant = useCallback((participantId: string) => {
    if (!currentHackathon) return;

    setHackathons(prev => prev.map(hackathon => 
      hackathon.id === currentHackathon.id 
        ? { ...hackathon, participants: hackathon.participants.filter(p => p.id !== participantId) }
        : hackathon
    ));

    setCurrentHackathonState(prev => prev ? {
      ...prev,
      participants: prev.participants.filter(p => p.id !== participantId)
    } : null);
  }, [currentHackathon]);

  // Update participant locally
  const updateParticipant = useCallback((participantId: string, updates: Partial<Participant>) => {
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

    setCurrentHackathonState(prev => prev ? {
      ...prev,
      participants: prev.participants.map(p => 
        p.id === participantId ? { ...p, ...updates } : p
      )
    } : null);
  }, [currentHackathon]);

  // Replace all participants for current hackathon
  const replaceCurrentHackathonParticipants = useCallback((participants: Participant[]) => {
    if (!currentHackathon) return;

    setHackathons(prev => prev.map(hackathon =>
      hackathon.id === currentHackathon.id
        ? { ...hackathon, participants }
        : hackathon
    ));

    setCurrentHackathonState(prev => prev ? { ...prev, participants } : null);
  }, [currentHackathon]);

  // Create hackathon via API
  const createHackathon = useCallback(async (data: HackathonCreateRequest): Promise<Hackathon | null> => {
    try {
      const response = await adminHackathonApi.create(data);
      const newHackathon = mapHackathonResponseToHackathon(response.data);
      
      setHackathons(prev => [...prev, newHackathon]);
      toast.success('Hackathon created successfully');
      
      return newHackathon;
    } catch (err) {
      console.error('Failed to create hackathon:', err);
      return null;
    }
  }, []);

  // Update hackathon via API
  const updateHackathon = useCallback(async (id: string, data: HackathonUpdateRequest): Promise<Hackathon | null> => {
    try {
      const response = await adminHackathonApi.update(Number(id), data);
      const updatedHackathon = mapHackathonResponseToHackathon(response.data);
      
      // Preserve participants
      const existingHackathon = hackathons.find(h => h.id === id);
      if (existingHackathon) {
        updatedHackathon.participants = existingHackathon.participants;
      }
      
      setHackathons(prev => prev.map(h => h.id === id ? updatedHackathon : h));
      
      if (currentHackathon?.id === id) {
        setCurrentHackathonState(updatedHackathon);
      }
      
      toast.success('Hackathon updated successfully');
      return updatedHackathon;
    } catch (err) {
      console.error('Failed to update hackathon:', err);
      return null;
    }
  }, [hackathons, currentHackathon]);

  // Delete hackathon via API
  const deleteHackathon = useCallback(async (id: string): Promise<boolean> => {
    try {
      await adminHackathonApi.delete(Number(id));
      
      setHackathons(prev => prev.filter(h => h.id !== id));
      
      if (currentHackathon?.id === id) {
        const remaining = hackathons.filter(h => h.id !== id);
        setCurrentHackathonState(remaining.length > 0 ? remaining[0] : null);
      }
      
      toast.success('Hackathon deleted successfully');
      return true;
    } catch (err) {
      console.error('Failed to delete hackathon:', err);
      return false;
    }
  }, [hackathons, currentHackathon]);

  const value: HackathonContextType = {
    hackathons,
    currentHackathon,
    isLoading,
    isLoadingParticipants,
    error,
    setCurrentHackathon,
    selectHackathonById,
    refreshHackathons,
    refreshParticipants,
    addParticipant,
    removeParticipant,
    updateParticipant,
    replaceCurrentHackathonParticipants,
    createHackathon,
    updateHackathon,
    deleteHackathon,
  };

  return (
    <HackathonContext.Provider value={value}>
      {children}
    </HackathonContext.Provider>
  );
};

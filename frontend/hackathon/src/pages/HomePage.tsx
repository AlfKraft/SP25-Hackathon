import { useHackathon } from '@/contexts/HackathonContext'
import { Button } from '@/components/ui/button'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import CSVUploadPopup from '@/components/features/CSVUploadPopup'
import { toast } from 'sonner'
import { participantApi } from '@/services/api'
import { mapParticipantDtoToParticipant, getStatusDisplayInfo } from '@/types/hackathon'
import { RefreshCw, Upload, Users, Calendar, MapPin, Plus } from 'lucide-react'

export default function HomePage() {
  const navigate = useNavigate();
  const { 
    currentHackathon, 
    hackathons,
    replaceCurrentHackathonParticipants, 
    isLoading, 
    isLoadingParticipants,
    error,
    refreshHackathons,
    refreshParticipants 
  } = useHackathon();
  const [showCSVPopup, setShowCSVPopup] = useState(false);

  const handleUploadParticipants = () => {
    setShowCSVPopup(true);
  }

  const handleCSVUploadComplete = async () => {
    try {
      const response = await participantApi.getAll();
      const mappedParticipants = response.data.map(mapParticipantDtoToParticipant);

      replaceCurrentHackathonParticipants(mappedParticipants);
      toast.success('Participants imported successfully');
    } catch (error) {
      console.error('Error fetching participants:', error);
      toast.error('Failed to fetch participants. Please try again.');
    } finally {
      setShowCSVPopup(false);
    }
  }

  const handleRefreshParticipants = async () => {
    await refreshParticipants();
    toast.success('Participants refreshed');
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading hackathons...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !currentHackathon) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="bg-red-100 text-red-800 rounded-full p-4">
            <span className="text-2xl">⚠️</span>
          </div>
          <p className="text-muted-foreground">{error}</p>
          <Button onClick={refreshHackathons} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {currentHackathon && ( 
        <div className="bg-card border rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold">{currentHackathon.name}</h2>
            {currentHackathon.status && (
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusDisplayInfo(currentHackathon.status).className}`}>
                {getStatusDisplayInfo(currentHackathon.status).label}
              </span>
            )}
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Hackathon Details */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Details</h3>
              <div className="space-y-3 text-sm">
                <p className="text-muted-foreground">{currentHackathon.description}</p>
                
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>{currentHackathon.location}</span>
                </div>
                
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>
                    {currentHackathon.startDate.toLocaleDateString()} - {currentHackathon.endDate.toLocaleDateString()}
                  </span>
                </div>

                {currentHackathon.theme && (
                  <p>
                    <span className="font-medium">Theme:</span> {currentHackathon.theme}
                  </p>
                )}
              </div>

              {/* Admin info if available */}
              {(currentHackathon.requireApproval !== undefined || currentHackathon.allowTeamCreation !== undefined) && (
                <div className="pt-4 border-t space-y-2">
                  <h4 className="font-medium text-sm">Settings</h4>
                  <div className="flex gap-4 text-xs">
                    {currentHackathon.requireApproval !== undefined && (
                      <span className={`px-2 py-1 rounded ${currentHackathon.requireApproval ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-600'}`}>
                        {currentHackathon.requireApproval ? 'Approval Required' : 'Open Registration'}
                      </span>
                    )}
                    {currentHackathon.allowTeamCreation !== undefined && (
                      <span className={`px-2 py-1 rounded ${currentHackathon.allowTeamCreation ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                        {currentHackathon.allowTeamCreation ? 'Team Creation Allowed' : 'No Team Creation'}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            {/* Participants Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Participants
                </h3>
                {currentHackathon.participants.length > 0 && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleRefreshParticipants}
                    disabled={isLoadingParticipants}
                  >
                    <RefreshCw className={`h-4 w-4 mr-1 ${isLoadingParticipants ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                )}
              </div>

              {currentHackathon.participants.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-4 py-8 bg-muted/30 rounded-lg">
                  <Users className="h-12 w-12 text-muted-foreground" />
                  <div className="text-center">
                    <h4 className="font-medium mb-1">No participants yet</h4>
                    <p className="text-sm text-muted-foreground mb-4">
                      Upload a CSV file to add participants to this hackathon.
                    </p>
                    <Button onClick={handleUploadParticipants}>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Participants
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="bg-muted/30 rounded-lg p-4">
                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div>
                        <p className="text-2xl font-bold">{currentHackathon.participants.length}</p>
                        <p className="text-sm text-muted-foreground">Total Participants</p>
                      </div>
                      {currentHackathon.maxParticipants && (
                        <div>
                          <p className="text-2xl font-bold">{currentHackathon.maxParticipants - currentHackathon.participants.length}</p>
                          <p className="text-sm text-muted-foreground">Spots Available</p>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <Button onClick={handleUploadParticipants} variant="outline" className="w-full">
                    <Upload className="h-4 w-4 mr-2" />
                    Upload More Participants
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {!currentHackathon && (
        <div className="bg-card border rounded-lg p-8 text-center">
          <div className="max-w-md mx-auto">
            <div className="bg-muted/30 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <Calendar className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold mb-2">
              {hackathons.length === 0 ? 'No Hackathons Yet' : 'No Hackathon Selected'}
            </h2>
            <p className="text-muted-foreground mb-6">
              {hackathons.length === 0 
                ? 'Get started by creating your first hackathon to manage participants and build teams.'
                : 'Use the dropdown in the navigation to select a hackathon or create a new one.'
              }
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={() => navigate('/create-hackathon')}>
                <Plus className="h-4 w-4 mr-2" />
                Create Hackathon
              </Button>
              {hackathons.length > 0 && (
                <Button onClick={refreshHackathons} variant="outline">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {showCSVPopup && currentHackathon && (
        <CSVUploadPopup 
          hackathonId={Number(currentHackathon.id)}
          onClose={() => setShowCSVPopup(false)}
          onUploadComplete={handleCSVUploadComplete}
        />
      )}
    </div>
  )
}

import { useHackathon } from '@/contexts/HackathonContext'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Button } from '@/components/ui/button'
import { SearchIcon, ArrowUpDown, Filter, Edit, Save, X, Trash2, RefreshCw, Users, Upload } from 'lucide-react'
import { useState, useMemo } from 'react'
import type { Participant } from '@/types/hackathon'
import { toast } from 'sonner'
import CSVUploadPopup from '@/components/features/CSVUploadPopup'
import { participantApi } from '@/services/api'
import { mapParticipantDtoToParticipant } from '@/types/hackathon'


export default function ParticipantsPage() {
  const { 
    currentHackathon, 
    updateParticipant, 
    removeParticipant, 
    isLoading, 
    isLoadingParticipants,
    refreshParticipants,
    replaceCurrentHackathonParticipants
  } = useHackathon()
  
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editData, setEditData] = useState<Partial<Participant>>({})
  const [searchQuery, setSearchQuery] = useState('')
  const [showCSVPopup, setShowCSVPopup] = useState(false)

  const handleEdit = (participant: Participant) => {
    setEditingId(participant.id)
    setEditData({
      email: participant.email,
      skills: participant.skills,
      motivation: participant.motivation,
      yearsExperience: participant.yearsExperience
    })
  }

  const handleSave = (participantId: string) => {
    if (editData.email || editData.motivation !== undefined || editData.skills) {
      updateParticipant(participantId, editData)
      toast.success('Participant updated')
    }
    setEditingId(null)
    setEditData({})
  }

  const handleCancel = () => {
    setEditingId(null)
    setEditData({})
  }

  const handleFieldChange = (field: keyof Participant, value: string | string[] | number) => {
    setEditData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleDelete = (participantId: string) => {
    removeParticipant(participantId)
    toast.success('Participant deleted')
  }



  const handleCSVUploadComplete = async () => {
    try {
      const response = await participantApi.getAll()
      const mappedParticipants = response.data.map(mapParticipantDtoToParticipant)
      replaceCurrentHackathonParticipants(mappedParticipants)
      toast.success('Participants imported successfully')
    } catch (error) {
      console.error('Error fetching participants:', error)
      toast.error('Failed to fetch participants')
    } finally {
      setShowCSVPopup(false)
    }
  }

  const filteredParticipants = useMemo(() => {
    if (!currentHackathon) return []
    
    let result = [...currentHackathon.participants]

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(p => 
        p.email.toLowerCase().includes(query) ||
        p.name.toLowerCase().includes(query) ||
        p.skills.some(s => s.toLowerCase().includes(query))
      )
    }

    result.sort((a, b) => a.email.localeCompare(b.email))

    return result
  }, [currentHackathon?.participants, searchQuery])
  

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading participants...</p>
        </div>
      </div>
    )
  }

  if (!currentHackathon) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">No Hackathon Selected</h2>
          <p className="text-muted-foreground">
            Please select a hackathon from the navigation menu.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Participants</h1>
          <p className="text-muted-foreground mt-1">
            {currentHackathon.participants.length} participants in {currentHackathon.name}
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => refreshParticipants()}
            disabled={isLoadingParticipants}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingParticipants ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={() => setShowCSVPopup(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Import CSV
          </Button>
        </div>
      </div>

      {currentHackathon.participants.length > 0 ? (
        <div className="flex flex-col gap-4"> 
          <div className="flex gap-3 items-center flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <InputGroup>
                <InputGroupInput 
                  placeholder="Search by email, name, or skills..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <InputGroupAddon>
                  <SearchIcon className="h-4 w-4" />
                </InputGroupAddon>
              </InputGroup>
            </div>            
          </div>

          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredParticipants.map((participant) => (
                  <TableRow key={participant.id}>
                    <TableCell>
                      {editingId === participant.id ? (
                        <input
                          type="email"
                          value={editData.email || ''}
                          onChange={(e) => handleFieldChange('email', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                      ) : (
                        <div>
                          <p className="font-medium">{participant.name}</p>
                          <p className="text-sm text-muted-foreground">{participant.email}</p>
                        </div>
                      )}
                    </TableCell>
                    
                    <TableCell>
                      {editingId === participant.id ? (
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSave(participant.id)}
                            className="h-8 w-8 p-0"
                          >
                            <Save className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleCancel}
                            className="h-8 w-8 p-0"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(participant)}
                            className="h-8 w-8 p-0"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(participant.id)}
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      ) : (
        <div className="text-center py-12 bg-muted/30 rounded-lg border-2 border-dashed">
          <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No participants yet</h3>
          <p className="text-muted-foreground mb-4">
            Import participants from a CSV file to get started.
          </p>
          <Button onClick={() => setShowCSVPopup(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Import CSV
          </Button>
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

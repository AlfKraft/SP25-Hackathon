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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { SearchIcon, ArrowUpDown, Filter, Edit, Save, X, Trash2 } from 'lucide-react'
import { useState } from 'react'
import type { Participant } from '@/types/hackathon'
import { toast } from 'sonner'

export default function ParticipantsPage() {
  const { currentHackathon, updateParticipant, removeParticipant } = useHackathon()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editData, setEditData] = useState<Partial<Participant>>({})

  const handleEdit = (participant: Participant) => {
    setEditingId(participant.id)
    setEditData({
      email: participant.email,
      skills: participant.skills,
      motivation: participant.motivation
    })
  }

  const handleSave = (participantId: string) => {
    if (editData.email || editData.motivation || editData.skills) {
      updateParticipant(participantId, editData)
    }
    setEditingId(null)
    setEditData({})
  }

  const handleCancel = () => {
    setEditingId(null)
    setEditData({})
  }

  const handleFieldChange = (field: keyof Participant, value: string | string[]) => {
    setEditData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleDelete = (participantId: string) => {
    removeParticipant(participantId)
    toast.success('Participant deleted successfully')
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-4">Participants</h1>
      <p className="text-lg text-muted-foreground mb-6">
        View all participants for the current hackathon.
      </p>

      {currentHackathon && currentHackathon.participants.length > 0 ? (
        <div className="flex flex-col gap-4"> 
          <div className="flex gap-3 items-center">
            <div className="flex-1">
              <InputGroup>
                <InputGroupInput placeholder="Search..." />
                <InputGroupAddon>
                  <SearchIcon />
                </InputGroupAddon>
              </InputGroup>
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <ArrowUpDown className="h-4 w-4 mr-2" />
                  Sort
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem>Sort by Email</DropdownMenuItem>
                <DropdownMenuItem>Sort by Skills</DropdownMenuItem>
                <DropdownMenuItem>Sort by Motivation</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-2" />
                  Filter
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80">
                <div className="space-y-4">
                  <h4 className="font-medium">Filter by:</h4>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium">Email</label>
                      <input 
                        type="text" 
                        placeholder="Filter by email..." 
                        className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                      />
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium">Skills</label>
                      <input 
                        type="text" 
                        placeholder="Filter by skills..." 
                        className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                      />
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium">Motivation</label>
                      <input 
                        type="text" 
                        placeholder="Filter by motivation..." 
                        className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                      />
                    </div>
                  </div>
                  
                  <div className="flex gap-2 pt-2">
                    <Button size="sm" className="flex-1">Apply</Button>
                    <Button size="sm" variant="outline" className="flex-1">Clear</Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Skills</TableHead>
                <TableHead>Motivation</TableHead>
                <TableHead>Years of Experience</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentHackathon.participants.map((participant) => (
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
                      participant.email
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === participant.id ? (
                      <input
                        type="text"
                        value={editData.skills?.join(', ') || ''}
                        onChange={(e) => handleFieldChange('skills', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                        placeholder="Enter skills separated by commas"
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                    ) : (
                      participant.skills.join(', ')
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === participant.id ? (
                      <textarea
                        value={editData.motivation || ''}
                        onChange={(e) => handleFieldChange('motivation', e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm resize-none"
                      />
                    ) : (
                      participant.motivation
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === participant.id ? (
                      <textarea
                        value={editData.yearsExperience || ''}
                        onChange={(e) => handleFieldChange('yearsExperience', e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm resize-none"
                      />
                    ) : (
                      participant.yearsExperience
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
        <div className="text-center py-8 text-muted-foreground">
          <p>No participants available.</p>
        </div>
      )}
    </div>
  )
}

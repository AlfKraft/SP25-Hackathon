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
import { SearchIcon, ArrowUpDown, Filter } from 'lucide-react'

export default function ParticipantsPage() {
  const { currentHackathon } = useHackathon()

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
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentHackathon.participants.map((participant) => (
                <TableRow key={participant.id}>
                  <TableCell>{participant.email}</TableCell>
                  <TableCell>{participant.skills.join(', ')}</TableCell>
                  <TableCell>{participant.motivation}</TableCell>
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

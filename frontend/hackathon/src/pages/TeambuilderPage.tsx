import { useCallback, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ReactFlow, applyNodeChanges, applyEdgeChanges, addEdge, type Edge, type Node, type NodeChange, type Connection, type EdgeChange, Background, Controls, MiniMap } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { teamApi } from '@/services/api'
import type { Team } from '@/types/hackathon'
import { useHackathon } from '@/contexts/HackathonContext'
import { toast } from 'sonner'
import { Download, RefreshCw, Users, Zap } from 'lucide-react'

function calculateGradient(motivation: number): string {
  switch (motivation) {
    case 1:
      return '#ff4444'
    case 2:
      return '#ff8c00'
    case 3:
      return '#ffd700'
    case 4:
      return '#9acd32'
    default:
      return '#22c55e'
  }
}

function convertTeamsToGraph(teams: Team[]): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = []
  const edges: Edge[] = []

  const gridSize = Math.ceil(Math.sqrt(teams.length))
  teams.forEach((team, teamIndex) => {
    const teamNodeId = `team-${team.id}`
    
    nodes.push({
      id: teamNodeId,
      position: { x: (teamIndex % gridSize) * 650, y: Math.floor(teamIndex / gridSize) * 650 },
      data: { label: team.name, teamId: team.id, score: team.score },
      style: { 
        background: '#ffffff', 
        color: '#000000', 
        fontWeight: 'bold', 
        fontSize: '14px',
        border: '2px solid #3b82f6',
        borderRadius: '12px',
        padding: '12px 16px',
        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
      }
    })

    const teamX = (teamIndex % gridSize) * 650
    const teamY = Math.floor(teamIndex / gridSize) * 650
    
    team.members.forEach((member, memberIndex) => {
      const memberNodeId = `member/${team.id}/${member.participantId}`
      const angle = (memberIndex / team.members.length) * 2 * Math.PI - Math.PI / 2
      const radius = 180
      
      nodes.push({
        id: memberNodeId,
        position: {
          x: teamX + radius * Math.cos(angle),
          y: teamY + radius * Math.sin(angle)
        },
        data: { 
          label: `P${member.participantId}`,
          role: member.role,
          motivation: member.motivation,
          participantId: member.participantId
        },
        style: { 
          background: calculateGradient(member.motivation), 
          color: '#000', 
          fontSize: '11px',
          borderRadius: '8px',
          padding: '8px',
          border: '1px solid rgba(0,0,0,0.1)',
          boxShadow: '0 2px 4px rgb(0 0 0 / 0.1)'
        }
      })

      edges.push({
        id: `from-${memberNodeId}`,
        source: teamNodeId,
        target: memberNodeId,
      })
    })
  })

  return { nodes, edges }
}

export default function TeambuilderPage() {
  const { currentHackathon } = useHackathon()
  const [teamSize, setTeamSize] = useState<number>(4)
  const [loading, setLoading] = useState(false)
  const [currentGenerationId, setCurrentGenerationId] = useState<string | null>(null)
  const [teamsData, setTeamsData] = useState<Team[]>([])

  const [nodes, setNodes] = useState<Node[]>([])
  const [edges, setEdges] = useState<Edge[]>([])

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => setNodes((nodesSnapshot) => applyNodeChanges(changes, nodesSnapshot)),
    [],
  );
  
  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => setEdges((edgesSnapshot) => applyEdgeChanges(changes, edgesSnapshot)),
    [],
  );

  const onConnect = useCallback(
    async (params: Connection) => {
      if (!params.source || !params.target) return
      
      const isMemberToTeam = 
        (params.source.startsWith('member') && params.target.startsWith('team-')) ||
        (params.source.startsWith('team-') && params.target.startsWith('member'))
      
      const memberNodeId = params.source.startsWith('member') ? params.source : params.target.startsWith('member') ? params.target : null
      const teamNodeId = params.source.startsWith('team-') ? params.source : params.target.startsWith('team-') ? params.target : null

      if (isMemberToTeam && memberNodeId && teamNodeId) {
        const parts = memberNodeId.split('/')
        const participantId = parseInt(parts[2])
        const targetTeamId = teamNodeId.replace('team-', '')

        setEdges((edgesSnapshot) => {
          const filteredEdges = edgesSnapshot.filter(
            (edge) => edge.source !== memberNodeId && edge.target !== memberNodeId
          )
          return addEdge(params, filteredEdges)
        })

        try {
          await teamApi.moveMember(participantId, targetTeamId)
          toast.success(`Moved participant ${participantId} to new team`)
        } catch (error) {
          console.error('Failed to move member:', error)
          toast.error('Failed to move participant. Reverting...')
          
          if (currentGenerationId) {
            const response = await teamApi.getTeams(currentGenerationId)
            const { nodes: newNodes, edges: newEdges } = convertTeamsToGraph(response.data)
            setNodes(newNodes)
            setEdges(newEdges)
            setTeamsData(response.data)
          }
        }
      }
    },
    [currentGenerationId],
  );

  const handleGenerateTeams = async () => {
    if (!currentHackathon) {
      toast.error('Please select a hackathon first')
      return
    }

    setLoading(true)
    try {
      const hackathonId = Number(currentHackathon.id)
      const response = await teamApi.generate(hackathonId, teamSize)
      const generationId = response.data.generationId
      setCurrentGenerationId(generationId)

      const teamsResponse = await teamApi.getTeams(generationId)
      const teams = teamsResponse.data
      setTeamsData(teams)
      
      const { nodes: newNodes, edges: newEdges } = convertTeamsToGraph(teams)
      setNodes(newNodes)
      setEdges(newEdges)
      
      toast.success(`Generated ${teams.length} teams!`)
    } catch (error) {
      console.error('Failed to generate teams:', error)
      toast.error('Failed to generate teams. Please try again.')
    } finally {
      setLoading(false)
    }
  };

  const refreshTeams = async () => {
    if (!currentGenerationId) return
    
    setLoading(true)
    try {
      const response = await teamApi.getTeams(currentGenerationId)
      const teams = response.data
      setTeamsData(teams)
      
      const { nodes: newNodes, edges: newEdges } = convertTeamsToGraph(teams)
      setNodes(newNodes)
      setEdges(newEdges)
      
      toast.success('Teams refreshed')
    } catch (error) {
      console.error('Failed to refresh teams:', error)
      toast.error('Failed to refresh teams')
    } finally {
      setLoading(false)
    }
  };

  const downloadTeams = () => {
    const members = nodes.filter(node => node.id.startsWith('member'))
    interface DownloadTeam {
      team: string
      memberId: string
      role: string
      motivation: number
    }
    const teams: DownloadTeam[] = []
    
    members.forEach(member => {
      const connectedEdge = edges.find(edge => edge.source === member.id || edge.target === member.id)
      if (connectedEdge) {
        const teamNodeId = connectedEdge.source === member.id ? connectedEdge.target : connectedEdge.source
        const teamNode = nodes.find(node => node.id === teamNodeId)
        if (teamNode) {
          const memberData = member.data as Record<string, unknown>
          const teamData = teamNode.data as Record<string, unknown>
          teams.push({
            team: String(teamData.label || 'Unknown'),
            memberId: String(memberData.participantId || 'Unknown'),
            role: String(memberData.role || 'N/A'),
            motivation: Number(memberData.motivation || 0)
          })
        }
      }
    })

    const csvContent = "data:text/csv;charset=utf-8," 
      + "Team,Member ID,Role,Motivation\n" 
      + teams.map(t => `"${t.team}",${t.memberId},"${t.role}",${t.motivation}`).join("\n")

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `teams-${currentHackathon?.name || 'export'}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    toast.success('Teams exported to CSV')
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Team Builder</h1>
          <p className="text-muted-foreground mt-1">
            {currentHackathon ? `Building teams for ${currentHackathon.name}` : 'Select a hackathon to build teams'}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 mb-6 p-4 bg-card border rounded-lg">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Team Size:</label>
          <Input 
            type="number" 
            min={1}
            max={100}
            value={teamSize} 
            onChange={(e) => setTeamSize(Number(e.target.value))}
            className="w-20"
          />
        </div>
        
        <Button onClick={handleGenerateTeams} disabled={loading || !currentHackathon}>
          {loading ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Zap className="h-4 w-4 mr-2" />
              Generate Teams
            </>
          )}
        </Button>

        {currentGenerationId && (
          <Button variant="outline" onClick={refreshTeams} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        )}

        <div className="flex-1" />

        <Button variant="outline" onClick={downloadTeams} disabled={nodes.length === 0}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {teamsData.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-card border rounded-lg p-4 text-center">
            <Users className="h-6 w-6 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-bold">{teamsData.length}</p>
            <p className="text-sm text-muted-foreground">Teams</p>
          </div>
          <div className="bg-card border rounded-lg p-4 text-center">
            <Users className="h-6 w-6 mx-auto mb-2 text-green-500" />
            <p className="text-2xl font-bold">
              {teamsData.reduce((acc, team) => acc + team.members.length, 0)}
            </p>
            <p className="text-sm text-muted-foreground">Participants</p>
          </div>
          <div className="bg-card border rounded-lg p-4 text-center">
            <Users className="h-6 w-6 mx-auto mb-2 text-blue-500" />
            <p className="text-2xl font-bold">
              {(teamsData.reduce((acc, team) => acc + team.members.length, 0) / teamsData.length || 0).toFixed(1)}
            </p>
            <p className="text-sm text-muted-foreground">Avg per Team</p>
          </div>
        </div>
      )}

      {nodes.length === 0 && (
        <div className="bg-muted/30 border-2 border-dashed rounded-lg p-8 text-center mb-6">
          <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-medium mb-2">No teams generated yet</h3>
          <p className="text-muted-foreground mb-4">
            Set your desired team size and click "Generate Teams" to automatically create balanced teams.
          </p>
          <p className="text-sm text-muted-foreground">
            Tip: Drag connections between participants and teams to move members.
          </p>
        </div>
      )}

      <div className="h-[600px] w-full border rounded-lg bg-slate-50 dark:bg-slate-900">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          fitView
          className="rounded-lg"
        >
          <Background />
          <MiniMap 
            nodeStrokeWidth={3}
            className="bg-white dark:bg-slate-800"
          />
        </ReactFlow>
      </div>

      <div className="mt-4 p-4 bg-card border rounded-lg">
        <h4 className="font-medium mb-2">Motivation Legend</h4>
        <div className="flex flex-wrap gap-4">
          {[1, 2, 3, 4, 5].map((level) => (
            <div key={level} className="flex items-center gap-2">
              <div 
                className="w-4 h-4 rounded" 
                style={{ backgroundColor: calculateGradient(level) }}
              />
              <span className="text-sm">{level} - {level === 1 ? 'Low' : level === 5 ? 'High' : ''}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

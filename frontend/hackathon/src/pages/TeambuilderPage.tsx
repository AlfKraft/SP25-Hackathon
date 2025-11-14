import { useCallback, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ReactFlow, applyNodeChanges, applyEdgeChanges, addEdge, type Edge, type Node, type NodeChange, type Connection, type EdgeChange } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

interface Team {
  id: string;
  name: string;
  score: number;
  generationId: string;
  createdAt: string;
  members: {
    participantId: number;
    role: string;
    skills: string;
    motivation: number;
    yearsExperience: number;
  }[];
}
function calculateGradient(motivation: number): string {
  switch (motivation) {
    case 1:
      return '#ff0000';
    case 2:
      return '#ff6905';
    case 3:
      return '#ffda05';
    case 4:
      return '#a3ff05';
    default:
      return '#089103';
  }
}
function convertTeamsToGraph(teams: Team[]): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  const gridSize = Math.ceil(Math.sqrt(teams.length));
  teams.forEach((team, teamIndex) => {
    const teamNodeId = `team-${team.id}`;
    
    nodes.push({
      id: teamNodeId,
      position: { x: (teamIndex % gridSize) * 600, y: Math.floor(teamIndex / gridSize) * 600 },
      data: { label: `${team.name}` },
      style: { background: "#ffffff", color: '#000000', fontWeight: 'bold', fontSize: '14px' }
    });

    const teamX = (teamIndex % gridSize) * 600;
    const teamY = Math.floor(teamIndex / gridSize) * 600;
    
    team.members.forEach((member, memberIndex) => {
      const memberNodeId = `member/${team.id}/${member.participantId}`;
      const angle = (memberIndex / team.members.length) * 2 * Math.PI;
      const radius = 150;
      
      nodes.push({
        id: memberNodeId,
        position: {
          x: teamX + radius * Math.cos(angle),
          y: teamY + radius * Math.sin(angle)
        },
        data: { 
          label: `P${member.participantId}\n${member.role}\nMotivation: ${member.motivation}` 
        },
        style: { background: calculateGradient(member.motivation), color: '#000', fontSize: '12px' }
      });

      // Create edge from team to member
      edges.push({
        id: `from-${memberNodeId}`,
        source: teamNodeId,
        target: memberNodeId
      });
    });
  });

  return { nodes, edges };
}

export default function TeambuilderPage() {
  const [teamSize, setTeamSize] = useState<number>(4)
  const [loading, setLoading] = useState(false)

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
    (params: Connection) => {
      if (!params.source || !params.target) return;
      const isMemberToTeam = params.source.startsWith('member') && params.target.startsWith('team-') || params.source.startsWith('team-') && params.target.startsWith('member');
      const member = params.source.startsWith('member') ? params.source : params.target.startsWith('member') ? params.target : null;

      if (isMemberToTeam) {
        setEdges((edgesSnapshot) => {
          const filteredEdges = edgesSnapshot.filter(
            (edge) => edge.source !== member && edge.target !== member
          );
          return addEdge(params, filteredEdges);
        });
      } else {
        setEdges((edgesSnapshot) => addEdge(params, edgesSnapshot));
      }
    },
    [],
  );

  const handleGenerateTeams = async () => {
    setLoading(true)
    try {
      const response = await fetch(`http://ec2-13-60-173-183.eu-north-1.compute.amazonaws.com/api/teams/generate?teamSize=${teamSize}`, {
        method: 'POST'
      })
      if (response.ok) {
        const generateData = await response.json()
        const generationId = generateData.generationId
        const teamsResponse = await fetch(`http://ec2-13-60-173-183.eu-north-1.compute.amazonaws.com/api/teams?generationId=${generationId}`)
        const teamsData: Team[] = await teamsResponse.json()
        
        // Convert teams to graph
        const { nodes: newNodes, edges: newEdges } = convertTeamsToGraph(teamsData)
        setNodes(newNodes)
        setEdges(newEdges)
      }
    } finally {
      setLoading(false)
    }
  }

  const downloadTeams = () => {
    const members = nodes.filter(node => node.id.startsWith('member'));
    interface DownloadTeam {
      team: string;
      member: string;
    }
    const teams: DownloadTeam[] = [];
    members.forEach(member => {
      const connectedEdge = edges.find(edge => edge.source === member.id || edge.target === member.id);
      if (connectedEdge) {
        const teamNodeId = connectedEdge.source === member.id ? connectedEdge.target : connectedEdge.source;
        const teamNode = nodes.find(node => node.id === teamNodeId);
        const memberID = member.id.split('/')[2];
        if (teamNode) {
          teams.push({
            team: teamNode.data.label as string,
            member: memberID
          });
        }
      }
    });

    const csvContent = "data:text/csv;charset=utf-8," 
      + "Team,Member\n" 
      + teams.map(t => `${t.team},${t.member}`).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "teams.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-4">Team builder</h1>
      <div className="flex justify-between mb-4">
        <div className='flex gap-4'>
        <Input 
          type="number" 
          value={teamSize} 
          onChange={(e) => setTeamSize(Number(e.target.value))}
          className="w-32"
        />
        <Button onClick={handleGenerateTeams} disabled={loading}>
          Generate Teams
        </Button>
        </div>
        <Button onClick={downloadTeams}>
          Download Teams
        </Button>

      </div>
      <div className="h-[600px] w-full border rounded-lg">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          fitView
        />
      </div>
    </div>
  )
}

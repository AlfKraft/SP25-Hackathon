import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function TeambuilderPage() {
  const [teamSize, setTeamSize] = useState<number>(4)
  const [teams, setTeams] = useState([])
  const [loading, setLoading] = useState(false)

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
        const teamsData = await teamsResponse.json()
        setTeams(teamsData)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-4">Team builder</h1>
      <div className="flex gap-4 mb-4">
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
      {teams.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold mb-4">Generated Teams</h2>
          <pre>{JSON.stringify(teams, null, 2)}</pre>
        </div>
      )}
    </div>
  )
}

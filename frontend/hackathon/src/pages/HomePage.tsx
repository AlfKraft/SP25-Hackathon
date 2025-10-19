import { useHackathon } from '@/contexts/HackathonContext'
import { Button } from '@/components/ui/button'
import { useState } from 'react'
import CSVUploadPopup from '@/components/features/CSVUploadPopup'
import { toast } from 'sonner'
export default function HomePage() {
  const { currentHackathon } = useHackathon();
  const [showCSVPopup, setShowCSVPopup] = useState(false);

  const handleUploadParticipants = () => {
    setShowCSVPopup(true);
  }

  const handleCSVUploadComplete = async (previewId: string) => {
    try {
      const formData = new FormData()
      formData.append('previewId', previewId)
      const response = await fetch(`http://ec2-13-60-173-183.eu-north-1.compute.amazonaws.com/api/uploads/import`, {
        method: 'POST',
        body: formData,
      })
      const data = await response.json()
      console.log(data, "data")
    } catch (error) {
      console.error('Error importing participants:', error)
    } finally {
      setShowCSVPopup(false)
      toast.success('Participants imported successfully')
    }
  }

  return (
    <div className="space-y-6">
      {currentHackathon && ( 
        <div className="bg-card border rounded-lg p-6">
          <h2 className="text-2xl font-semibold mb-4">Current Hackathon: {currentHackathon.name}</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-medium mb-2">Hackathon Details</h3>
              <div className="space-y-2 text-sm">
                <p><span className="font-medium">Description:</span> {currentHackathon.description}</p>
                <p><span className="font-medium">Theme:</span> {currentHackathon.theme}</p>
                <p><span className="font-medium">Location:</span> {currentHackathon.location}</p>
                <p><span className="font-medium">Start Date:</span> {currentHackathon.startDate.toLocaleDateString()}</p>
                <p><span className="font-medium">End Date:</span> {currentHackathon.endDate.toLocaleDateString()}</p>
                <p><span className="font-medium">Status:</span> 
                  <span className={`ml-2 px-2 py-1 rounded-full text-xs ${
                    currentHackathon.status === 'upcoming' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                    currentHackathon.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                    'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                  }`}>
                    {currentHackathon.status}
                  </span>
                </p>
              </div>
            </div>
            
            {currentHackathon.participants.length === 0 && (
              <div className="flex flex-col items-center justify-center gap-2 gap-y-4">
                <h3 className="text-lg font-medium mb-2">No participants yet</h3>
                <p className="text-muted-foreground">
                  There are no participants yet for this hackathon.
                </p>
                <Button onClick={handleUploadParticipants}>
                  Click here to upload participants
                </Button>
              </div>
            )}
          </div>
          
        </div>
      )}

      {!currentHackathon && (
        <div className="bg-card border rounded-lg p-6 text-center">
          <h2 className="text-xl font-semibold mb-2">No Hackathon Selected</h2>
          <p className="text-muted-foreground">
            Use the dropdown in the navigation to select a hackathon or create a new Hackathon.
          </p>
        </div>
      )}

      {showCSVPopup && (
        <CSVUploadPopup 
          onClose={() => setShowCSVPopup(false)}
          onUploadComplete={handleCSVUploadComplete}
        />
      )}
    </div>
  )
}

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useHackathon } from '@/contexts/HackathonContext'
import type { HackathonCreateRequest } from '@/types/hackathon'
import { toast } from 'sonner'
import { ArrowLeft, Calendar, MapPin, FileText, Settings } from 'lucide-react'

export default function CreateHackathonPage() {
  const navigate = useNavigate()
  const { createHackathon, setCurrentHackathon } = useHackathon()
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const [formData, setFormData] = useState<HackathonCreateRequest>({
    name: '',
    description: '',
    location: '',
    startDate: '',
    endDate: '',
    requireApproval: false,
    allowTeamCreation: true,
    bannerUrl: '',
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required'
    } else if (formData.name.length > 255) {
      newErrors.name = 'Name must be less than 255 characters'
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required'
    } else if (formData.description.length > 5000) {
      newErrors.description = 'Description must be less than 5000 characters'
    }

    if (!formData.location.trim()) {
      newErrors.location = 'Location is required'
    } else if (formData.location.length > 255) {
      newErrors.location = 'Location must be less than 255 characters'
    }

    const now = new Date()
    
    if (!formData.startDate) {
      newErrors.startDate = 'Start date is required'
    } else {
      const start = new Date(formData.startDate)
      if (start < now) {
        newErrors.startDate = 'Start date must be in the present or future'
      }
    }

    if (!formData.endDate) {
      newErrors.endDate = 'End date is required'
    } else {
      const end = new Date(formData.endDate)
      if (end < now) {
        newErrors.endDate = 'End date must be in the present or future'
      }
    }

    if (formData.startDate && formData.endDate && !newErrors.startDate && !newErrors.endDate) {
      const start = new Date(formData.startDate)
      const end = new Date(formData.endDate)
      if (end < start) {
        newErrors.endDate = 'End date must be after start date'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      toast.error('Please fix the errors in the form')
      return
    }

    setIsSubmitting(true)
    
    try {
      const newHackathon = await createHackathon(formData)
      
      if (newHackathon) {
        setCurrentHackathon(newHackathon)
        navigate('/')
      }
    } catch (error) {
      console.error('Failed to create hackathon:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleChange = (field: keyof HackathonCreateRequest, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      <div className="bg-card border rounded-lg p-6 shadow-sm">
        <h1 className="text-2xl font-bold mb-6">Create New Hackathon</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Basic Information
            </h2>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Name <span className="text-red-500">*</span>
              </label>
              <Input
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="e.g., AI Innovation Challenge 2025"
                className={errors.name ? 'border-red-500' : ''}
              />
              {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Description <span className="text-red-500">*</span>
              </label>
              <Textarea
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="Describe your hackathon, its goals, and what participants will be working on..."
                rows={4}
                className={errors.description ? 'border-red-500' : ''}
              />
              {errors.description && <p className="text-sm text-red-500">{errors.description}</p>}
              <p className="text-xs text-muted-foreground">{formData.description.length}/5000 characters</p>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Location & Schedule
            </h2>

            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Location <span className="text-red-500">*</span>
              </label>
              <Input
                value={formData.location}
                onChange={(e) => handleChange('location', e.target.value)}
                placeholder="e.g., San Francisco, CA or Online"
                className={errors.location ? 'border-red-500' : ''}
              />
              {errors.location && <p className="text-sm text-red-500">{errors.location}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Start Date <span className="text-red-500">*</span>
                </label>
                <Input
                  type="datetime-local"
                  value={formData.startDate}
                  onChange={(e) => handleChange('startDate', e.target.value)}
                  min={new Date().toISOString().slice(0, 16)}
                  className={errors.startDate ? 'border-red-500' : ''}
                />
                {errors.startDate && <p className="text-sm text-red-500">{errors.startDate}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  End Date <span className="text-red-500">*</span>
                </label>
                <Input
                  type="datetime-local"
                  value={formData.endDate}
                  onChange={(e) => handleChange('endDate', e.target.value)}
                  min={formData.startDate || new Date().toISOString().slice(0, 16)}
                  className={errors.endDate ? 'border-red-500' : ''}
                />
                {errors.endDate && <p className="text-sm text-red-500">{errors.endDate}</p>}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Settings
            </h2>

            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.requireApproval}
                  onChange={(e) => handleChange('requireApproval', e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <div>
                  <span className="font-medium">Require Approval</span>
                  <p className="text-sm text-muted-foreground">
                    Manually approve participants before they can join
                  </p>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.allowTeamCreation}
                  onChange={(e) => handleChange('allowTeamCreation', e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <div>
                  <span className="font-medium">Allow Team Creation</span>
                  <p className="text-sm text-muted-foreground">
                    Let participants create and join their own teams
                  </p>
                </div>
              </label>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Banner URL (Optional)</label>
              <Input
                value={formData.bannerUrl}
                onChange={(e) => handleChange('bannerUrl', e.target.value)}
                placeholder="https://example.com/banner.jpg"
              />
              <p className="text-xs text-muted-foreground">
                URL to a banner image for your hackathon (max 1000 characters)
              </p>
            </div>
          </div>

          <div className="flex gap-4 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(-1)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? 'Creating...' : 'Create Hackathon'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}


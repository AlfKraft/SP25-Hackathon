import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { API_URL } from '@/lib/config'
import { toast } from 'sonner'
import { 
  Plus, 
  Trash2, 
  Save, 
  Send, 
  GripVertical, 
  RefreshCw,
  FileText,
  ToggleLeft,
  List,
  Type,
  Hash,
  Eye,
  Loader2
} from 'lucide-react'

interface Hackathon {
  id: number
  name: string
  slug: string
  description: string
  status: string
}

interface QuestionOption {
  value: string
  label: string
}

interface Question {
  id: string
  type: 'text' | 'textarea' | 'number' | 'select' | 'multiselect' | 'boolean'
  label: string
  placeholder?: string
  required: boolean
  options?: QuestionOption[]
}

interface Questionnaire {
  id?: number
  title: string
  description: string
  questions: Question[]
}

const QUESTION_TYPES = [
  { value: 'text', label: 'Short Text', icon: Type },
  { value: 'textarea', label: 'Long Text', icon: FileText },
  { value: 'number', label: 'Number', icon: Hash },
  { value: 'select', label: 'Single Choice', icon: List },
  { value: 'multiselect', label: 'Multiple Choice', icon: List },
  { value: 'boolean', label: 'Yes/No', icon: ToggleLeft },
]

export default function QuestionnairePage() {
  const { id } = useParams<{ id: string }>()
  const hackathonId = id ? Number(id) : NaN

  const [hackathon, setHackathon] = useState<Hackathon | null>(null)
  const [hackathonLoading, setHackathonLoading] = useState(true)
  const [questionnaire, setQuestionnaire] = useState<Questionnaire>({
    title: '',
    description: '',
    questions: [],
  })
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [showPreview, setShowPreview] = useState(false)

  // Load hackathon data
  useEffect(() => {
    if (!hackathonId || Number.isNaN(hackathonId)) return

    const loadHackathon = async () => {
      setHackathonLoading(true)
      try {
        const res = await fetch(`${API_URL}/api/admin/hackathons/${hackathonId}`, {
          method: 'GET',
          credentials: 'include',
        })
        if (!res.ok) {
          throw new Error('Failed to load hackathon')
        }
        const data: Hackathon = await res.json()
        setHackathon(data)
      } catch (error) {
        console.error('Failed to load hackathon:', error)
        toast.error('Failed to load hackathon')
      } finally {
        setHackathonLoading(false)
      }
    }

    void loadHackathon()
  }, [hackathonId])

  // Load existing questionnaire
  useEffect(() => {
    if (hackathon) {
      loadQuestionnaire()
    }
  }, [hackathon?.id])

  const loadQuestionnaire = async () => {
    if (!hackathonId || Number.isNaN(hackathonId)) return
    
    setIsLoading(true)
    try {
      const res = await fetch(
        `${API_URL}/api/admin/hackathons/${hackathonId}/questionnaire`,
        {
          method: 'GET',
          credentials: 'include',
        }
      )
      if (res.ok) {
        const data = await res.json()
        if (data) {
          setQuestionnaire(data as Questionnaire)
        }
      }
    } catch (error) {
      // No questionnaire exists yet, that's okay
      console.log('No existing questionnaire found')
    } finally {
      setIsLoading(false)
    }
  }

  const addQuestion = (type: Question['type']) => {
    const newQuestion: Question = {
      id: `q-${Date.now()}`,
      type,
      label: '',
      required: false,
      ...(type === 'select' || type === 'multiselect' ? { options: [{ value: '', label: '' }] } : {}),
    }
    setQuestionnaire(prev => ({
      ...prev,
      questions: [...prev.questions, newQuestion],
    }))
  }

  const updateQuestion = (id: string, updates: Partial<Question>) => {
    setQuestionnaire(prev => ({
      ...prev,
      questions: prev.questions.map(q => q.id === id ? { ...q, ...updates } : q),
    }))
  }

  const removeQuestion = (id: string) => {
    setQuestionnaire(prev => ({
      ...prev,
      questions: prev.questions.filter(q => q.id !== id),
    }))
  }

  const addOption = (questionId: string) => {
    setQuestionnaire(prev => ({
      ...prev,
      questions: prev.questions.map(q => {
        if (q.id === questionId && q.options) {
          return { ...q, options: [...q.options, { value: '', label: '' }] }
        }
        return q
      }),
    }))
  }

  const updateOption = (questionId: string, optionIndex: number, value: string) => {
    setQuestionnaire(prev => ({
      ...prev,
      questions: prev.questions.map(q => {
        if (q.id === questionId && q.options) {
          const newOptions = [...q.options]
          newOptions[optionIndex] = { value, label: value }
          return { ...q, options: newOptions }
        }
        return q
      }),
    }))
  }

  const removeOption = (questionId: string, optionIndex: number) => {
    setQuestionnaire(prev => ({
      ...prev,
      questions: prev.questions.map(q => {
        if (q.id === questionId && q.options) {
          return { ...q, options: q.options.filter((_, i) => i !== optionIndex) }
        }
        return q
      }),
    }))
  }

  const handleSave = async () => {
    if (!hackathonId || Number.isNaN(hackathonId)) {
      toast.error('Invalid hackathon')
      return
    }

    if (!questionnaire.title.trim()) {
      toast.error('Please enter a questionnaire title')
      return
    }

    setIsSaving(true)
    try {
      const res = await fetch(
        `${API_URL}/api/admin/hackathons/${hackathonId}/questionnaire/internal`,
        {
          method: 'PUT',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(questionnaire),
        }
      )
      if (!res.ok) {
        throw new Error('Failed to save questionnaire')
      }
      toast.success('Questionnaire saved as draft')
    } catch (error) {
      console.error('Failed to save questionnaire:', error)
      toast.error('Failed to save questionnaire')
    } finally {
      setIsSaving(false)
    }
  }

  const handlePublish = async () => {
    if (!hackathonId || Number.isNaN(hackathonId)) return

    setIsPublishing(true)
    try {
      // Save first, then publish
      const saveRes = await fetch(
        `${API_URL}/api/admin/hackathons/${hackathonId}/questionnaire/internal`,
        {
          method: 'PUT',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(questionnaire),
        }
      )
      if (!saveRes.ok) {
        throw new Error('Failed to save questionnaire')
      }

      const publishRes = await fetch(
        `${API_URL}/api/admin/hackathons/${hackathonId}/questionnaire/publish`,
        {
          method: 'POST',
          credentials: 'include',
        }
      )
      if (!publishRes.ok) {
        const text = await publishRes.text()
        throw new Error(text || 'Failed to publish questionnaire')
      }
      toast.success('Questionnaire published successfully!')
    } catch (error: any) {
      console.error('Failed to publish questionnaire:', error)
      toast.error(error?.message || 'Failed to publish questionnaire')
    } finally {
      setIsPublishing(false)
    }
  }

  const renderQuestionEditor = (question: Question) => {
    const TypeIcon = QUESTION_TYPES.find(t => t.value === question.type)?.icon || Type

    return (
      <div key={question.id} className="border rounded-lg p-4 bg-white dark:bg-slate-800 space-y-4">
        <div className="flex items-start gap-3">
          <div className="cursor-move text-muted-foreground mt-2">
            <GripVertical className="h-5 w-5" />
          </div>
          
          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-2">
              <TypeIcon className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground uppercase">
                {QUESTION_TYPES.find(t => t.value === question.type)?.label}
              </span>
            </div>

            <Input
              value={question.label}
              onChange={(e) => updateQuestion(question.id, { label: e.target.value })}
              placeholder="Enter question text..."
              className="font-medium"
            />

            {(question.type === 'text' || question.type === 'textarea' || question.type === 'number') && (
              <Input
                value={question.placeholder || ''}
                onChange={(e) => updateQuestion(question.id, { placeholder: e.target.value })}
                placeholder="Placeholder text (optional)"
                className="text-sm"
              />
            )}

            {(question.type === 'select' || question.type === 'multiselect') && (
              <div className="space-y-2 pl-4 border-l-2 border-muted">
                <p className="text-xs text-muted-foreground">Options:</p>
                {question.options?.map((option, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      value={option.value}
                      onChange={(e) => updateOption(question.id, index, e.target.value)}
                      placeholder={`Option ${index + 1}`}
                      className="text-sm"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeOption(question.id, index)}
                      disabled={question.options?.length === 1}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => addOption(question.id)}
                  className="text-xs"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add Option
                </Button>
              </div>
            )}

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={question.required}
                onChange={(e) => updateQuestion(question.id, { required: e.target.checked })}
                className="rounded"
              />
              Required
            </label>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => removeQuestion(question.id)}
            className="text-red-500 hover:text-red-600 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    )
  }

  const renderPreview = () => (
    <div className="border rounded-lg p-6 bg-white dark:bg-slate-800 space-y-6">
      <div>
        <h2 className="text-xl font-bold">{questionnaire.title || 'Untitled Questionnaire'}</h2>
        {questionnaire.description && (
          <p className="text-muted-foreground mt-2">{questionnaire.description}</p>
        )}
      </div>

      {questionnaire.questions.map((question, index) => (
        <div key={question.id} className="space-y-2">
          <label className="font-medium">
            {index + 1}. {question.label || 'Untitled Question'}
            {question.required && <span className="text-red-500 ml-1">*</span>}
          </label>

          {question.type === 'text' && (
            <Input placeholder={question.placeholder} disabled />
          )}

          {question.type === 'textarea' && (
            <Textarea placeholder={question.placeholder} disabled rows={3} />
          )}

          {question.type === 'number' && (
            <Input type="number" placeholder={question.placeholder} disabled className="w-32" />
          )}

          {question.type === 'select' && (
            <select className="w-full border rounded-md p-2" disabled>
              <option>Select an option...</option>
              {question.options?.map((opt, i) => (
                <option key={i}>{opt.label || `Option ${i + 1}`}</option>
              ))}
            </select>
          )}

          {question.type === 'multiselect' && (
            <div className="space-y-2">
              {question.options?.map((opt, i) => (
                <label key={i} className="flex items-center gap-2">
                  <input type="checkbox" disabled className="rounded" />
                  {opt.label || `Option ${i + 1}`}
                </label>
              ))}
            </div>
          )}

          {question.type === 'boolean' && (
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input type="radio" name={question.id} disabled />
                Yes
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" name={question.id} disabled />
                No
              </label>
            </div>
          )}
        </div>
      ))}

      {questionnaire.questions.length === 0 && (
        <p className="text-muted-foreground text-center py-8">
          No questions added yet
        </p>
      )}
    </div>
  )

  if (hackathonLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  if (!hackathon) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Hackathon Not Found</h2>
          <p className="text-muted-foreground">
            The hackathon you're looking for doesn't exist or you don't have access to it.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Questionnaire Builder</h1>
          <p className="text-muted-foreground mt-1">
            Create and manage the intake questionnaire for {hackathon.name}
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowPreview(!showPreview)}
          >
            <Eye className="h-4 w-4 mr-2" />
            {showPreview ? 'Edit' : 'Preview'}
          </Button>
          <Button
            variant="outline"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Draft
          </Button>
          <Button
            onClick={handlePublish}
            disabled={isPublishing || questionnaire.questions.length === 0}
          >
            {isPublishing ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            Publish
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : showPreview ? (
        renderPreview()
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Editor */}
          <div className="lg:col-span-2 space-y-4">
            {/* Title & Description */}
            <div className="border rounded-lg p-4 bg-card space-y-4">
              <Input
                value={questionnaire.title}
                onChange={(e) => setQuestionnaire(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Questionnaire Title"
                className="text-xl font-bold border-0 p-0 focus-visible:ring-0"
              />
              <Textarea
                value={questionnaire.description}
                onChange={(e) => setQuestionnaire(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Add a description for participants..."
                className="border-0 p-0 focus-visible:ring-0 resize-none"
                rows={2}
              />
            </div>

            {/* Questions */}
            <div className="space-y-4">
              {questionnaire.questions.map(renderQuestionEditor)}
            </div>

            {questionnaire.questions.length === 0 && (
              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-medium mb-2">No questions yet</h3>
                <p className="text-muted-foreground text-sm mb-4">
                  Add questions using the panel on the right
                </p>
              </div>
            )}
          </div>

          {/* Sidebar - Add Questions */}
          <div className="space-y-4">
            <div className="border rounded-lg p-4 bg-card sticky top-4">
              <h3 className="font-semibold mb-4">Add Question</h3>
              <div className="grid grid-cols-2 gap-2">
                {QUESTION_TYPES.map(({ value, label, icon: Icon }) => (
                  <Button
                    key={value}
                    variant="outline"
                    className="flex flex-col items-center gap-1 h-auto py-3"
                    onClick={() => addQuestion(value as Question['type'])}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="text-xs">{label}</span>
                  </Button>
                ))}
              </div>
            </div>

            {/* Stats */}
            <div className="border rounded-lg p-4 bg-card">
              <h3 className="font-semibold mb-3">Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Questions</span>
                  <span className="font-medium">{questionnaire.questions.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Required</span>
                  <span className="font-medium">
                    {questionnaire.questions.filter(q => q.required).length}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


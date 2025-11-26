import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { uploadApi } from '@/services/api'
import type { ValidationReport } from '@/types/hackathon'
import { useHackathon } from '@/contexts/HackathonContext'
import { X, Upload, FileText, AlertCircle, CheckCircle } from 'lucide-react'

interface CSVUploadPopupProps {
  hackathonId?: number
  onClose: () => void
  onUploadComplete: (previewId: string) => void
}

export default function CSVUploadPopup({ hackathonId, onClose, onUploadComplete }: CSVUploadPopupProps) {
  const { hackathons, currentHackathon } = useHackathon()
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error' | 'validation'>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [validationData, setValidationData] = useState<ValidationReport | null>(null)
  const [currentPage, setCurrentPage] = useState<'upload' | 'validation'>('upload')
  const [selectedHackathonId, setSelectedHackathonId] = useState<number>(
    hackathonId || (currentHackathon ? Number(currentHackathon.id) : 0)
  )
  const fileInputRef = useRef<HTMLInputElement>(null)

  const mapErrorCode = (code: string): string => {
    const errorMap: Record<string, string> = {
      'MISSING_HEADER': 'Missing Header',
      'UNKNOWN_HEADER': 'Unknown Header',
      'INVALID_VALUE': 'Invalid Value',
      'REQUIRED_FIELD': 'Required Field',
      'DUPLICATE_EMAIL': 'Duplicate Email',
    }
    return errorMap[code] || code
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.name.endsWith('.csv')) {
      setSelectedFile(file)
      setUploadStatus('idle')
      setErrorMessage('')
    } else {
      setErrorMessage('Please select a valid CSV file')
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) return

    setIsUploading(true)
    setUploadStatus('idle')
    setErrorMessage('')

    try {
      const response = await uploadApi.validate(selectedFile)
      const data = response.data
      
      if (data.batchPreviewId) {
        setValidationData(data)
        setUploadStatus('validation')
        setCurrentPage('validation')
      }
    } catch (error) {
      console.error('Error uploading CSV:', error)
      setUploadStatus('error')
      setErrorMessage('Failed to upload CSV file. Please try again.')
    } finally {
      setIsUploading(false)
    }
  }

  const handleConfirmImport = async () => {
    if (!validationData?.batchPreviewId || !selectedHackathonId) {
      setErrorMessage('Please select a hackathon to import participants into.')
      return
    }

    if (validationData.validRows === 0) {
      setErrorMessage('No valid rows to import. Please fix the errors in your CSV file and try again.')
      return
    }

    setIsImporting(true)
    setErrorMessage('')
    
    try {
      const response = await uploadApi.import(validationData.batchPreviewId, selectedHackathonId)
      console.log('Import result:', response.data)
      onUploadComplete(validationData.batchPreviewId)
    } catch (error: unknown) {
      console.error('Error importing:', error)
      
      let message = 'Failed to import participants.'
      
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { message?: string; error?: string }; status?: number } }
        if (axiosError.response?.data?.message) {
          message = axiosError.response.data.message
        } else if (axiosError.response?.data?.error) {
          message = axiosError.response.data.error
        } else if (axiosError.response?.status === 500) {
          message = 'Server error occurred. This may be due to invalid data in your CSV. Please ensure all rows have valid data and try again.'
        }
      }
      
      setErrorMessage(message)
    } finally {
      setIsImporting(false)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file && file.name.endsWith('.csv')) {
      setSelectedFile(file)
      setUploadStatus('idle')
      setErrorMessage('')
    } else {
      setErrorMessage('Please drop a valid CSV file')
    }
  }

  const renderUploadPage = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">Target Hackathon</label>
        <select
          value={selectedHackathonId}
          onChange={(e) => setSelectedHackathonId(Number(e.target.value))}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
        >
          {hackathons.map((hackathon) => (
            <option key={hackathon.id} value={Number(hackathon.id)} className='text-gray-900'>
              {hackathon.name}
            </option>
          ))}
        </select>
      </div>

      <div
        className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors cursor-pointer"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <div className="space-y-2">
          <Upload className="mx-auto h-12 w-12 text-gray-400" />
          <div className="text-sm text-gray-600">
            <p>Drag and drop your CSV file here, or</p>
            <span className="text-blue-600 hover:text-blue-500 font-medium">
              browse to select a file
            </span>
          </div>
          <p className="text-xs text-gray-500">CSV files only</p>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        onChange={handleFileSelect}
        className="hidden"
      />

      {selectedFile && (
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-gray-500" />
              <div>
                <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
                <p className="text-xs text-gray-500">
                  {(selectedFile.size / 1024).toFixed(1)} KB
                </p>
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation()
                setSelectedFile(null)
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      <div className="text-xs text-gray-600 bg-blue-50 p-3 rounded-lg">
        <p className="font-medium mb-1">Expected CSV Format:</p>
        <p>The CSV should include columns for: email, first_name, last_name, role, skills, motivation, etc.</p>
      </div>

      {uploadStatus === 'success' && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <p className="text-green-800 text-sm">Participants uploaded successfully!</p>
        </div>
      )}

      {(uploadStatus === 'error' || errorMessage) && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <p className="text-red-800 text-sm">{errorMessage || 'Error uploading file. Please try again.'}</p>
        </div>
      )}

      <div className="flex justify-between gap-3">
        <Button onClick={onClose} className='flex-1 bg-red-500 text-white hover:bg-red-600'>
          Cancel
        </Button>
        <Button
          onClick={handleUpload}
          disabled={!selectedFile || isUploading || selectedHackathonId === 0}
          className='flex-1 bg-green-500 text-white hover:bg-green-600'
        >
          {isUploading ? 'Validating...' : 'Validate & Upload'}
        </Button>
      </div>
    </div>
  )

  const renderValidationPage = () => (
    <div className="space-y-4">
      {validationData && (
        <>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-xl font-bold text-gray-900">{validationData.totalRows}</div>
              <div className="text-xs text-gray-600">Total Rows</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-xl font-bold text-green-600">{validationData.validRows}</div>
              <div className="text-xs text-gray-600">Valid Rows</div>
            </div>
            <div className="text-center p-3 bg-red-50 rounded-lg">
              <div className="text-xl font-bold text-red-600">{validationData.invalidRows}</div>
              <div className="text-xs text-gray-600">Invalid Rows</div>
            </div>
          </div>

          {/* Top Error Codes Summary */}
          {validationData.topErrorCodes && validationData.topErrorCodes.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <h4 className="font-medium text-yellow-800 mb-2 text-sm">Error Summary:</h4>
              <div className="flex flex-wrap gap-2">
                {validationData.topErrorCodes.map((error, index) => (
                  <span key={index} className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs">
                    {mapErrorCode(error.code)}: {error.count}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Detailed Errors */}
          {validationData.errors.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-800 mb-2 text-sm">Errors Found ({validationData.errors.length}):</h4>
              <div className="max-h-48 overflow-y-auto space-y-2 border rounded-lg p-2">
                {validationData.errors.map((error, index) => (
                  <div key={index} className="bg-white rounded p-2 text-xs border-l-2 border-red-400">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-medium text-gray-900">Row {error.rowNumber}</span>
                        {error.columnNumber && <span className="ml-2 text-gray-500">Col {error.columnNumber}</span>}
                      </div>
                      <span className="bg-red-100 text-red-800 px-2 py-0.5 rounded text-xs">
                        {mapErrorCode(error.code)}
                      </span>
                    </div>
                    <div className="mt-1 text-gray-600">
                      <span className="font-medium">Header:</span> {error.header || 'N/A'}
                      {error.key && (
                        <>
                          <span className="mx-2">•</span>
                          <span className="font-medium">Field:</span> {error.key}
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {validationData.invalidRows > 0 && validationData.validRows > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-orange-800">
                  <p className="font-medium">Partial Import Warning</p>
                  <p className="mt-1">
                    {validationData.invalidRows} row(s) with errors will be skipped. 
                    Only {validationData.validRows} valid row(s) will be imported.
                  </p>
                </div>
              </div>
            </div>
          )}

          {validationData.validRows === 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-red-800">
                  <p className="font-medium">Cannot Import</p>
                  <p className="mt-1">
                    All rows have errors. Please fix the issues in your CSV file and upload again.
                  </p>
                </div>
              </div>
            </div>
          )}

          {validationData.validRows > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                <strong>Importing to:</strong>{' '}
                {hackathons.find(h => Number(h.id) === selectedHackathonId)?.name || 'Unknown hackathon'}
              </p>
            </div>
          )}

          {errorMessage && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <p className="text-red-800 text-sm">{errorMessage}</p>
            </div>
          )}

          <div className="flex gap-3">
            <Button 
              onClick={() => {
                setCurrentPage('upload')
                setUploadStatus('idle')
                setValidationData(null)
                setErrorMessage('')
              }}
              className="flex-1 bg-red-500 text-white hover:bg-red-600"
            >
              Back
            </Button>
            <Button 
              onClick={handleConfirmImport}
              disabled={isImporting || validationData.validRows === 0}
              className="flex-1 bg-green-500 text-white hover:bg-green-600"
            >
              {isImporting ? 'Importing...' : `Import ${validationData.validRows} Participants`}
            </Button>
          </div>
        </>
      )}
    </div>
  )

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4 shadow-xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">
            {currentPage === 'upload' ? 'Upload Participants CSV' : 'Validation Results'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {currentPage === 'upload' ? renderUploadPage() : renderValidationPage()}
      </div>
    </div>
  )
}

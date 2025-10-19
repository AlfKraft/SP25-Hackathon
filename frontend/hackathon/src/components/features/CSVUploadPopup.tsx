import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'

interface CSVUploadPopupProps {
  onClose: () => void
  onUploadComplete: (previewId: string) => void
}

interface ValidationError {
  rowNumber: number
  columnNumber: number | null
  key: string
  header: string
  code: string
  value: any
}

interface ValidationResponse {
  batchPreviewId: string
  totalRows: number
  validRows: number
  invalidRows: number
  topErrorCodes: Array<{
    code: string
    count: number
  }>
  errors: ValidationError[]
}

export default function CSVUploadPopup({ onClose, onUploadComplete }: CSVUploadPopupProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error' | 'validation'>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [validationData, setValidationData] = useState<ValidationResponse | null>(null)
  const [currentPage, setCurrentPage] = useState<'upload' | 'validation'>('upload')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const mapErrorCode = (code: string): string => {
    const errorMap: Record<string, string> = {
      'MISSING_HEADER': 'Missing Header',
      'UNKNOWN_HEADER': 'Unknown Header'
    }
    return errorMap[code] || code
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    console.log(file, "ee")
    if (file && file.name.endsWith('.csv')) {
      setSelectedFile(file)
      setUploadStatus('idle')
      setErrorMessage('')
    } else {
      alert('Please select a valid CSV file')
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) return

    setIsUploading(true)
    setUploadStatus('idle')
    setErrorMessage('')

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      
      const response = await fetch('http://ec2-13-60-173-183.eu-north-1.compute.amazonaws.com/api/upload/validate', {
        method: 'POST',
            body: formData,
            mode: 'cors',
      })
      const data = await response.json()
      console.log(data, "data")
      
      if (data.batchPreviewId) {
        setValidationData(data)
        setUploadStatus('validation')
        setCurrentPage('validation')
      } else if (data.success) {
        setUploadStatus('success')
        setTimeout(() => {
          onUploadComplete(data.batchPreviewId)
        }, 1500)
      } else {
        setUploadStatus('error')
        setErrorMessage(data.message || 'Upload failed')
      }
    } catch (error) {
      console.error('Error uploading CSV:', error)
      setUploadStatus('error')
      setErrorMessage('Failed to upload CSV file. Please try again.')
    } finally {
      setIsUploading(false)
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
      alert('Please drop a valid CSV file')
    }
  }

  const renderUploadPage = () => (
    <div className="space-y-4">
          <div
            className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <div className="space-y-2">
              <div className="text-gray-500">
                <svg className="mx-auto h-12 w-12" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                  <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div className="text-sm text-gray-600">
                <p>Drag and drop your CSV file here, or</p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-blue-600 hover:text-blue-500 font-medium"
                >
                  browse to select a file
                </button>
              </div>
              <p className="text-xs text-gray-500">
                CSV files only
              </p>
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
                <div>
                  <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
                  <p className="text-xs text-gray-500">
                    {(selectedFile.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <button
                  onClick={() => setSelectedFile(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
            </div>
          )}

          <div className="text-xs text-gray-600 bg-blue-50 p-3 rounded-lg">
            <p className="font-medium mb-1">Upload CSV file:</p>
            <p>Select a CSV file containing participant data.</p>
          </div>

          {uploadStatus === 'success' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-green-800 text-sm">
                ✓ Participants uploaded successfully!
              </p>
            </div>
          )}

          {uploadStatus === 'error' && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-800 text-sm">
                ✗ {errorMessage || 'Error uploading file. Please try again.'}
              </p>
            </div>
          )}


          <div className="flex justify-end gap-3">
            
            <Button
              onClick={handleUpload}
              disabled={!selectedFile || isUploading}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
            >
              {isUploading ? 'Uploading...' : 'Upload'}
            </Button>
          </div>
    </div>
  )

  const renderValidationPage = () => (
    <div className="space-y-4">
      {validationData && (
        <>
          <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
            <div className="text-center">
              <div className="font-medium text-gray-900">{validationData.totalRows}</div>
              <div className="text-gray-600">Total Rows</div>
            </div>
            <div className="text-center">
              <div className="font-medium text-green-600">{validationData.validRows}</div>
              <div className="text-gray-600">Valid Rows</div>
            </div>
            <div className="text-center">
              <div className="font-medium text-red-600">{validationData.invalidRows}</div>
              <div className="text-gray-600">Invalid Rows</div>
            </div>
          </div>

          {validationData.errors.length > 0 && (
            <div>
              <h4 className="font-medium text-yellow-800 mb-2">Errors Found:</h4>
              <div className="max-h-64 overflow-y-auto space-y-2">
                {validationData.errors.map((error, index) => (
                  <div key={index} className="bg-white rounded p-2 text-xs border">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-medium text-black">Row {error.rowNumber}</span>
                        {error.columnNumber && <span className="ml-2">Column {error.columnNumber}</span>}
                      </div>
                      <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs">
                        {mapErrorCode(error.code)}
                      </span>
                    </div>
                    <div className="mt-1 text-gray-600">
                      <span className="font-medium">Header:</span> {error.header}
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

          <div className="flex gap-3">
            <Button 
              
              onClick={() => {
                setCurrentPage('upload')
                setUploadStatus('idle')
                setValidationData(null)
              }}
              className="w-1/2 bg-red-600 hover:bg-red-700 text-white border-red-600"
            >
              Back
            </Button>
            <Button 
              onClick={() => onUploadComplete(validationData?.batchPreviewId)}
              disabled={validationData?.errors.length > 0 || !validationData?.batchPreviewId}
              className="w-1/2 bg-green-600 hover:bg-green-700 text-white disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              Confirm
            </Button>
          </div>
        </>
      )}
    </div>
  )

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-black">
            {currentPage === 'upload' ? 'Upload Participants CSV' : 'CSV Validation Results'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-xl"
          >
            ×
          </button>
        </div>

        {currentPage === 'upload' ? renderUploadPage() : renderValidationPage()}
      </div>
    </div>
  )
}

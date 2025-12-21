import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
    AlertCircle,
    CheckCircle2,
    Loader2,
    TriangleAlert,
    UploadCloud,
} from 'lucide-react'
import { toast } from 'sonner'
import { API_URL } from '@/lib/config'

// If you have a shared type for meta, reuse that instead
interface QuestionnaireMeta {
    id: number
    hackathonId: number
    title: string
    description: string
    sourceType: 'INTERNAL' | 'EXTERNAL_UPLOAD'
    isLocked: boolean
    createdAt?: string
    updatedAt?: string
}

interface ValidationError {
    rowNumber: number
    columnNumber: number | null
    key: string
    header: string
    code: string
    value: string | null
}

interface TopErrorCode {
    code: string
    count: number
}

interface ValidationReport {
    batchPreviewId: string
    totalRows: number
    validRows: number
    invalidRows: number
    topErrorCodes: TopErrorCode[]
    errors: ValidationError[]
}

interface ImportSummary {
    total: number
    inserted: number
    updated: number
    skipped: number
    deduped: number
}

interface Props {
    hackathonId: number
    currentMeta: QuestionnaireMeta | null
    onImported?: (meta: QuestionnaireMeta) => void
    requiredFields: string[]
}

export default function QuestionnaireImportSection({
                                                       hackathonId,
                                                       currentMeta,
                                                       onImported,
                                                       requiredFields,
                                                   }: Props) {
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [validation, setValidation] = useState<ValidationReport | null>(null)
    const [summary, setSummary] = useState<ImportSummary | null>(null)
    const [uploading, setUploading] = useState(false)
    const [importing, setImporting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleFileChange = (evt: React.ChangeEvent<HTMLInputElement>) => {
        const file = evt.target.files?.[0]
        setSelectedFile(file ?? null)
        setValidation(null)
        setSummary(null)
        setError(null)
    }

    const handleUploadAndValidate = async () => {
        if (!selectedFile) {
            toast.error('Please choose a file first')
            return
        }

        setUploading(true)
        setError(null)

        try {
            const formData = new FormData()
            formData.append('file', selectedFile)

            const res = await fetch(`${API_URL}/api/upload/validate`, {
                method: 'POST',
                credentials: 'include',
                body: formData,
            })

            if (!res.ok) {
                const text = await res.text()
                throw new Error(text || 'Validation failed')
            }

            const data: ValidationReport = await res.json()
            setValidation(data)
            toast.success('File validated')
        } catch (e: any) {
            console.error(e)
            setError(e?.message ?? 'Failed to validate file')
            toast.error('Failed to validate file')
        } finally {
            setUploading(false)
        }
    }

    const handleImport = async () => {
        if (!validation) {
            toast.error('Validate the file before importing')
            return
        }

        // extra guard: don't import if there are header errors
        if (headerErrors.length > 0) {
            toast.error('Cannot import while there are header errors')
            return
        }

        setImporting(true)
        setError(null)

        try {
            const res = await fetch(`${API_URL}/api/upload/import`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    batchPreviewId: validation.batchPreviewId,
                    hackathonId,
                }),
            })

            if (!res.ok) {
                const text = await res.text()
                throw new Error(text || 'Import failed')
            }

            const data: ImportSummary = await res.json()
            setSummary(data)
            toast.success('Questionnaire imported')

            if (onImported) {
                // After import, backend may not return meta directly.
                // So we ask parent to re-fetch. But if you return meta later, pass it here.
                onImported({
                    id: 0,              // placeholder if backend doesn't return meta yet
                    hackathonId,
                    title: '',
                    description: '',
                    sourceType: 'EXTERNAL_UPLOAD',
                    isLocked: true,
                })
            }
        } catch (e: any) {
            console.error(e)
            setError(e?.message ?? 'Failed to import')
            toast.error('Failed to import')
        } finally {
            setImporting(false)
        }
    }

    const baseInputClasses =
        'border-sky-500/40 bg-slate-900/80 text-sky-50 placeholder:text-sky-200/40 focus-visible:ring-sky-400'

    // ── Derived info from validation ──────────────────────────────────────────────

    const allErrors = validation?.errors ?? []

    // Header-related errors from your example:
    // UNKNOWN_HEADER and MISSING_HEADER
    const headerErrors = allErrors.filter(
        e => e.code === 'UNKNOWN_HEADER' || e.code === 'MISSING_HEADER',
    )

    const missingHeaderErrors = headerErrors.filter(e => e.code === 'MISSING_HEADER')
    const unknownHeaderErrors = headerErrors.filter(e => e.code === 'UNKNOWN_HEADER')

    // Names of headers reported as missing
    const missingHeaderNames = Array.from(
        new Set(
            missingHeaderErrors
                .map(e => e.key || e.header)
                .filter((v): v is string => Boolean(v)),
        ),
    )

    // Limit to required fields for a clearer message
    const missingRequiredHeaders = requiredFields.filter(field =>
        missingHeaderNames.includes(field),
    )

    // Unknown headers present in the file
    const unknownHeaderNames = Array.from(
        new Set(
            unknownHeaderErrors
                .map(e => e.key || e.header)
                .filter((v): v is string => Boolean(v)),
        ),
    )

    const hasAnyErrors = allErrors.length > 0
    const hasHeaderProblems = headerErrors.length > 0

    const maxErrorsToShow = 50
    const visibleErrors = allErrors.slice(0, maxErrorsToShow)

    // Import should not be possible if there are header errors
    const importDisabled = !validation || importing || hasHeaderProblems

    return (
        <Card className="border border-sky-500/20 bg-slate-900/70 shadow-[0_20px_60px_rgba(15,23,42,0.95)] backdrop-blur-xl">
            <CardHeader>
                <CardTitle className="flex items-center justify-between gap-3 text-sky-50">
                    <div className="flex items-center gap-2">
                        <UploadCloud className="h-5 w-5" />
                        <span>Import questionnaire from file</span>
                    </div>
                    {currentMeta?.sourceType === 'EXTERNAL_UPLOAD' && (
                        <span className="rounded-full border border-amber-400/40 bg-amber-500/15 px-3 py-1 text-[11px] text-amber-100">
              Currently using imported questionnaire
            </span>
                    )}
                </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4 text-sm text-sky-100/85">
                <p>
                    Upload a prepared file that defines your questionnaire and responses. After a
                    successful import, the questionnaire structure for this hackathon is locked.
                </p>

                {/* Required fields info */}
                <div className="space-y-2">
                    <p className="text-xs text-sky-200/80">
                        The file must include at least these columns (as keys or headers):
                    </p>
                    <div className="flex flex-wrap gap-2 text-xs">
                        {requiredFields.map(field => (
                            <span
                                key={field}
                                className="rounded-full border border-sky-500/40 bg-sky-500/10 px-3 py-1 font-mono"
                            >
                {field}
              </span>
                        ))}
                    </div>
                </div>

                {/* Error banner */}
                {error && (
                    <div className="flex items-center gap-2 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-100">
                        <AlertCircle className="h-4 w-4" />
                        <span>{error}</span>
                    </div>
                )}

                {/* Step 1: choose file */}
                <div className="space-y-3">
                    <div className="rounded-xl border border-sky-500/40 bg-slate-950/70 px-4 py-4">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-sky-200/80">
                            1 · Choose file
                        </p>
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                            <Input
                                type="file"
                                accept=".csv,.xlsx,.xls"
                                onChange={handleFileChange}
                                className={baseInputClasses + ' cursor-pointer'}
                            />
                            {selectedFile && (
                                <p className="text-xs text-sky-200/80">
                                    Selected:{' '}
                                    <span className="font-medium text-sky-50">
                    {selectedFile.name}
                  </span>
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Step 2: validate & show flawed data */}
                    <div className="rounded-xl border border-sky-500/40 bg-slate-950/70 px-4 py-4 space-y-3">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-sky-200/80">
                                    2 · Validate & inspect
                                </p>
                                {validation ? (
                                    <div className="text-xs text-sky-200/80 space-y-1">
                                        <p>
                                            Total rows:{' '}
                                            <span className="font-semibold">{validation.totalRows}</span>
                                        </p>
                                        <p>
                                            Valid:{' '}
                                            <span className="font-semibold text-emerald-300">
                        {validation.validRows}
                      </span>{' '}
                                            · Invalid:{' '}
                                            <span className="font-semibold text-rose-300">
                        {validation.invalidRows}
                      </span>
                                        </p>
                                    </div>
                                ) : (
                                    <p className="text-xs text-sky-200/80">
                                        Validate the file to see row statistics and detailed errors.
                                    </p>
                                )}
                            </div>

                            <Button
                                size="sm"
                                onClick={handleUploadAndValidate}
                                disabled={!selectedFile || uploading}
                                className="rounded-full bg-sky-500/90 px-4 text-sky-950 shadow-lg shadow-sky-500/40 hover:bg-sky-400"
                            >
                                {uploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Validate
                            </Button>
                        </div>

                        {/* Header issues summary */}
                        {validation && hasHeaderProblems && (
                            <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-3 text-xs text-amber-50 space-y-2">
                                <div className="flex items-start gap-2">
                                    <TriangleAlert className="mt-0.5 h-4 w-4" />
                                    <div>
                                        <p className="font-semibold">
                                            Header issues detected. Import is disabled until these are fixed.
                                        </p>
                                        <p className="text-[11px] text-amber-100/80">
                                            Fix your header row in the source file and validate again.
                                        </p>
                                    </div>
                                </div>

                                {missingRequiredHeaders.length > 0 && (
                                    <div className="space-y-1">
                                        <p className="text-[11px] font-semibold uppercase tracking-wide">
                                            Missing required headers
                                        </p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {missingRequiredHeaders.map(h => (
                                                <span
                                                    key={h}
                                                    className="rounded-full border border-amber-400/60 bg-amber-500/20 px-2 py-0.5 font-mono"
                                                >
                          {h}
                        </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {unknownHeaderNames.length > 0 && (
                                    <div className="space-y-1">
                                        <p className="text-[11px] font-semibold uppercase tracking-wide">
                                            Unknown headers in file
                                        </p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {unknownHeaderNames.map(h => (
                                                <span
                                                    key={h}
                                                    className="rounded-full border border-amber-400/40 bg-amber-500/15 px-2 py-0.5 font-mono"
                                                >
                          {h}
                        </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Top error codes */}
                        {validation && (
                            <div className="space-y-2">
                                <p className="text-[11px] font-semibold uppercase tracking-wide text-sky-200/80">
                                    Top error codes
                                </p>
                                {validation.topErrorCodes.length === 0 ? (
                                    <p className="text-xs text-emerald-200/80">
                                        No error codes reported. All rows appear structurally valid.
                                    </p>
                                ) : (
                                    <div className="flex flex-wrap gap-2 text-xs">
                                        {validation.topErrorCodes.map(err => (
                                            <span
                                                key={err.code}
                                                className="inline-flex items-center gap-1 rounded-full border border-rose-400/50 bg-rose-500/15 px-3 py-1"
                                            >
                        <TriangleAlert className="h-3 w-3" />
                        <span className="font-mono">{err.code}</span>
                        <span className="text-[10px] text-rose-100/80">
                          ({err.count})
                        </span>
                      </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Detailed error table (including header errors) */}
                        {validation && hasAnyErrors && (
                            <div className="space-y-2">
                                <p className="text-[11px] font-semibold uppercase tracking-wide text-sky-200/80">
                                    Invalid cells / header issues (showing first {visibleErrors.length} of{' '}
                                    {allErrors.length})
                                </p>
                                <div className="max-h-64 overflow-auto rounded-lg border border-sky-500/30 bg-slate-950/80 text-xs">
                                    <table className="min-w-full border-collapse text-left">
                                        <thead className="sticky top-0 bg-slate-900/95">
                                        <tr className="border-b border-sky-500/30">
                                            <Th>Row</Th>
                                            <Th>Col</Th>
                                            <Th>Header</Th>
                                            <Th>Code</Th>
                                            <Th>Value</Th>
                                        </tr>
                                        </thead>
                                        <tbody>
                                        {visibleErrors.map((err, idx) => (
                                            <tr
                                                key={idx}
                                                className="border-b border-slate-800/60 hover:bg-slate-900/60"
                                            >
                                                <Td>{err.rowNumber}</Td>
                                                <Td>{err.columnNumber ?? '-'}</Td>
                                                <Td>{err.header || err.key || '-'}</Td>
                                                <Td className="font-mono text-rose-200">{err.code}</Td>
                                                <Td className="max-w-[260px] truncate">
                                                    {err.value ?? ''}
                                                </Td>
                                            </tr>
                                        ))}
                                        </tbody>
                                    </table>
                                </div>
                                <p className="text-[11px] text-sky-300/70">
                                    Fix the issues in your source file and re-upload if necessary. Once
                                    you’re satisfied, proceed to import. 
                                </p>
                                <div className="mt-3 flex items-start gap-2 rounded-lg border border-rose-500/50 bg-rose-500/15 px-3 py-2.5">
                                    <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-rose-300" />
                                    <p className="text-xs font-medium text-rose-100">
                                        <span className="font-semibold">Important:</span> Participants with invalid or missing data will not be added to the hackathon. Make sure all entries are corrected before importing.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Step 3: import */}
                    <div className="rounded-xl border border-sky-500/40 bg-slate-950/70 px-4 py-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="text-xs text-sky-200/80 space-y-1">
                                <p className="text-xs font-semibold uppercase tracking-wide text-sky-200/80 mb-1">
                                    3 · Import to hackathon
                                </p>
                                <p>
                                    When you import, questionnaire and response data for this hackathon
                                    will be updated based on the file. The structure will be treated as an
                                    imported, non-editable questionnaire.
                                </p>

                                {hasHeaderProblems && (
                                    <p className="mt-2 text-[11px] text-amber-200/90">
                                        Import is disabled until all header issues have been resolved and the
                                        file is validated again.
                                    </p>
                                )}

                                {summary && (
                                    <div className="mt-3 grid gap-2 sm:grid-cols-5">
                                        <Stat label="Total" value={summary.total} />
                                        <Stat label="Inserted" value={summary.inserted} />
                                        <Stat label="Updated" value={summary.updated} />
                                        <Stat label="Skipped" value={summary.skipped} />
                                        <Stat label="Deduped" value={summary.deduped} />
                                    </div>
                                )}
                            </div>

                            <Button
                                size="sm"
                                variant="outline"
                                onClick={handleImport}
                                disabled={importDisabled}
                                className="rounded-full border-sky-500/60 bg-slate-900/80 text-sky-100 hover:bg-slate-800/80 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {importing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                <CheckCircle2 className="mr-2 h-4 w-4" />
                                Import
                            </Button>
                        </div>
                    </div>
                </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-2 text-xs text-sky-200/70 sm:flex-row sm:items-center sm:justify-between">
                <p>
                    You can re-import later with a new file. The questionnaire will still be
                    considered “imported & locked” for this hackathon.
                </p>
            </CardFooter>
        </Card>
    )
}

function Stat({ label, value }: { label: string; value: number }) {
    return (
        <div>
            <p className="text-[10px] uppercase text-sky-300/80">{label}</p>
            <p className="text-sm font-semibold text-sky-50">{value}</p>
        </div>
    )
}

// Small helpers for the table header/body
import * as React from 'react'
const cx = (...parts: Array<string | undefined>) =>
    parts.filter(Boolean).join(' ')

interface CellProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
    children: React.ReactNode
}

function Th({ children, className, ...props }: CellProps) {
    return (
        <th
            className={cx(
                'px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-sky-200/80',
                className,
            )}
            {...props}
        >
            {children}
        </th>
    )
}

function Td({ children, className, ...props }: CellProps) {
    return (
        <td
            className={cx(
                'px-3 py-1.5 align-top text-[11px] text-sky-100/90',
                className,
            )}
            {...props}
        >
            {children}
        </td>
    )
}

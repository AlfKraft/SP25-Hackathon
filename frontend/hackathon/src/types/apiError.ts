export type ApiError = {
    code?: string
    message?: string
    status?: number
    path?: string
    timestamp?: string
    fieldErrors?: Array<{ field: string; message: string }> | null
}

export async function readApiError(res: Response): Promise<string> {
    const contentType = res.headers.get('content-type') ?? ''

    // Prefer JSON
    if (contentType.includes('application/json')) {
        try {
            const data = (await res.json()) as ApiError
            if (data?.message) return data.message
        } catch {
            // fall through
        }
    }

    // Fallback to text
    const text = await res.text().catch(() => '')
    if (!text) return `Request failed (status ${res.status})`

    // Defensive JSON parse
    try {
        const parsed = JSON.parse(text) as ApiError
        if (parsed?.message) return parsed.message
    } catch {}

    return text
}

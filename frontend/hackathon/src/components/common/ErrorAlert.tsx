type Props = {
    title?: string
    message: string
}

export function ErrorAlert({ title = 'Something went wrong', message }: Props) {
    return (
        <div className="rounded-lg border border-rose-500/20 bg-rose-950/20 p-4 text-sm text-rose-200 space-y-1">
            <div className="font-medium text-rose-100">{title}</div>
            <div className="text-rose-200/90">{message}</div>
        </div>
    )
}
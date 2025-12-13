import { useCallback, useState } from 'react'
import type {
    Dispatch,
    SetStateAction,
    DragEvent,
    MouseEvent,
    KeyboardEvent,
} from 'react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    AlertDialog,
    AlertDialogTrigger,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogCancel,
    AlertDialogAction,
} from '@/components/ui/alert-dialog'
import { Trash2 } from 'lucide-react'
import type { Team, TeamMember } from '@/pages/HackathonTeamsPage'

interface TeamsBoardProps {
    teams: Team[]
    onTeamsChange: Dispatch<SetStateAction<Team[]>>

    onMoveMember?: (payload: {
        fromTeamId: string
        toTeamId: string
        participantId: number
    }) => void

    onRenameTeam?: (teamId: string, newName: string) => void
    onDeleteTeam?: (teamId: string) => void
    onRemoveMember?: (teamId: string, participantId: number) => void
}

// Motivation badge color helper
function getMotivationColor(score?: number) {
    if (score == null) return 'border-slate-500/50 bg-slate-800/50 text-slate-300'

    if (score >= 5) {
        return 'border-green-500/70 bg-green-500/10 text-green-300'
    }
    if (score >= 4) {
        return 'border-emerald-500/70 bg-emerald-500/10 text-emerald-200'
    }
    if (score >= 3) {
        return 'border-yellow-500/70 bg-yellow-500/10 text-yellow-200'
    }
    if (score >= 2) {
        return 'border-orange-500/70 bg-orange-500/10 text-orange-200'
    }
    return 'border-red-500/70 bg-red-500/10 text-red-200'
}

export function TeamsBoard({
                               teams,
                               onTeamsChange,
                               onMoveMember,
                               onRenameTeam,
                               onDeleteTeam,
                               onRemoveMember,
                           }: TeamsBoardProps) {
    const [editingTeamId, setEditingTeamId] = useState<string | null>(null)
    const [editingName, setEditingName] = useState('')

    // ---------------------------------------------------------------------------
    // Drag & drop
    // ---------------------------------------------------------------------------

    const handleDragStart = useCallback(
        (event: DragEvent<HTMLDivElement>, teamId: string, participantId: number) => {
            const payload = JSON.stringify({ fromTeamId: teamId, participantId })
            event.dataTransfer.setData('application/json', payload)
            event.dataTransfer.effectAllowed = 'move'
        },
        [],
    )

    const handleAllowDrop = useCallback((event: DragEvent<HTMLDivElement>) => {
        event.preventDefault()
        event.dataTransfer.dropEffect = 'move'
    }, [])

    const handleDropOnTeam = useCallback(
        (teamId: string, event: DragEvent<HTMLDivElement>) => {
            event.preventDefault()
            const raw = event.dataTransfer.getData('application/json')
            if (!raw) return

            try {
                const parsed: { fromTeamId: string; participantId: number } =
                    JSON.parse(raw)

                if (!parsed.fromTeamId || !parsed.participantId) return
                if (parsed.fromTeamId === teamId) return

                // 1) optimistic local update
                onTeamsChange(prevTeams => {
                    const updated = prevTeams.map(t => ({ ...t, members: [...t.members] }))
                    const sourceTeam = updated.find(t => t.id === parsed.fromTeamId)
                    const targetTeam = updated.find(t => t.id === teamId)

                    if (!sourceTeam || !targetTeam) return prevTeams

                    const memberIndex = sourceTeam.members.findIndex(
                        m => m.participant.id === parsed.participantId,
                    )
                    if (memberIndex === -1) return prevTeams

                    const [member] = sourceTeam.members.splice(memberIndex, 1)
                    targetTeam.members.push(member)

                    return updated
                })

                // 2) tell parent so it can call backend + recalc scores
                if (onMoveMember) {
                    onMoveMember({
                        fromTeamId: parsed.fromTeamId,
                        toTeamId: teamId,
                        participantId: parsed.participantId,
                    })
                }
            } catch (e) {
                console.error('Failed to handle drop', e)
            }
        },
        [onTeamsChange, onMoveMember],
    )

    // ---------------------------------------------------------------------------
    // Rename logic
    // ---------------------------------------------------------------------------

    const startEditingTeam = (team: Team, e?: MouseEvent) => {
        e?.stopPropagation()
        setEditingTeamId(team.id)
        setEditingName(team.name)
    }

    const cancelEditing = () => {
        setEditingTeamId(null)
        setEditingName('')
    }

    const saveEditing = () => {
        if (!editingTeamId || !editingName.trim()) {
            cancelEditing()
            return
        }
        if (onRenameTeam) {
            onRenameTeam(editingTeamId, editingName.trim())
        }
        cancelEditing()
    }

    const handleTeamNameKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault()
            saveEditing()
        }
        if (e.key === 'Escape') {
            e.preventDefault()
            cancelEditing()
        }
    }

    // ---------------------------------------------------------------------------
    // Member card renderer (with delete dialog)
    // ---------------------------------------------------------------------------

    const renderMemberCard = (team: Team, member: TeamMember) => {
        const skills = (member.skills ?? '')
            .split(/[;,]/)
            .map(s => s.trim())
            .filter(Boolean)

        return (
            <div
                key={member.participant.id}
                className={cn(
                    'group rounded-xl border border-slate-800/80 bg-slate-900/80 px-3 py-2',
                    'flex items-start justify-between gap-2 text-[11px] text-slate-100',
                    'transition-shadow duration-300',
                    'hover:shadow-[0_0_14px_rgba(56,189,248,0.45)] hover:border-sky-400/50'
                )}
                draggable
                onDragStart={event =>
                    handleDragStart(event, team.id, member.participant.id)
                }
            >
                <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-1">
            <span className="font-semibold text-sky-50">
              {member.participant.firstName} {member.participant.lastName}
            </span>
                        {member.role && (
                            <span className="rounded-full bg-slate-950/80 px-3 py-[2px] text-[11px] font-medium text-sky-200">
  {member.role}
</span>
                        )}
                    </div>

                    {skills.length === 0 ? (
                        <div className="text-[10px] text-sky-300/80">
                            No skills recorded
                        </div>
                    ) : (
                        <div className="mt-3 flex flex-wrap gap-1">
                            {skills.map(skill => (
                                <Badge
                                    key={skill}
                                    variant="outline"
                                    className="border-sky-500/50 bg-slate-950/80 text-[9px] text-sky-200"
                                >
                                    {skill}
                                </Badge>
                            ))}
                        </div>
                    )}

                    <div className="mt-3 flex flex-wrap items-center gap-1">
                        {typeof member.motivation === 'number' && (
                            <Badge
                                variant="outline"
                                className={cn(
                                    'text-[9px]',
                                    getMotivationColor(member.motivation),
                                )}
                            >
                                Motivation: {member.motivation}
                            </Badge>
                        )}
                        {typeof member.yearsExperience === 'number' && (
                            <Badge
                                variant="outline"
                                className="border-sky-500/60 bg-sky-500/10 text-[9px] text-sky-200"
                            >
                                Experience: {member.yearsExperience} years
                            </Badge>
                        )}
                    </div>
                </div>

                {/* Delete member from team – AlertDialog */}
                {onRemoveMember && (
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button
                                type="button"
                                size="icon"
                                variant="outline"
                                className="ml-1 mt-0.5 h-6 w-6 hidden items-center justify-center border-rose-500/60 bg-rose-500/10 text-rose-100 hover:bg-rose-500/20 group-hover:flex"
                                aria-label="Remove from team"
                            >
                                <Trash2 className="h-3 w-3" />
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="border border-rose-500/40 bg-slate-950">
                            <AlertDialogHeader>
                                <AlertDialogTitle className="text-rose-100">
                                    Remove participant from team?
                                </AlertDialogTitle>
                                <AlertDialogDescription className="text-sky-200/80">
                                    This will remove{' '}
                                    <span className="font-semibold">
                    {member.participant.firstName} {member.participant.lastName}
                  </span>{' '}
                                    from{' '}
                                    <span className="font-semibold">"{team.name}"</span> in this
                                    team layout. The participant will{' '}
                                    <span className="font-semibold">not</span> be deleted from the
                                    hackathon.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel className="border-slate-600 bg-slate-900 text-sky-100 hover:bg-slate-800">
                                    Cancel
                                </AlertDialogCancel>
                                <AlertDialogAction
                                    className="border border-rose-500/60 bg-rose-600/90 text-rose-50 hover:bg-rose-500"
                                    onClick={() =>
                                        onRemoveMember(team.id, member.participant.id)
                                    }
                                >
                                    Remove from team
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                )}
            </div>
        )
    }

    // ---------------------------------------------------------------------------
    // Layout: grid of teams, with team delete dialog
    // ---------------------------------------------------------------------------
    const getGridCols = (count: number) => {
        if (count <= 1) {
            return 'grid-cols-1'
        }
        if (count === 2) {
            // 1 column on mobile, 2 on md+
            return 'grid-cols-1 md:grid-cols-2'
        }
        // 3 or more teams → cap at 3 columns on md+
        return 'grid-cols-1 md:grid-cols-3'
    }

    return (
        <div className={cn('grid w-full gap-4 pb-4', getGridCols(teams.length))}>
            {teams.map(team => (
                <div
                    key={team.id}
                    className={cn(
                        'flex flex-col rounded-2xl border',
                        'border-slate-800/80 bg-gradient-to-br from-slate-900/90 via-slate-950/95 to-slate-950/95',
                        'shadow-inner shadow-slate-900/60',
                    )}
                    onDragOver={handleAllowDrop}
                    onDrop={event => handleDropOnTeam(team.id, event)}
                >
                    {/* Column header */}
                    <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 px-3 py-2.5">
                        <div className="flex flex-col gap-1">
                            {editingTeamId === team.id ? (
                                <Input
                                    autoFocus
                                    className="h-7 bg-slate-950/90 text-xs"
                                    value={editingName}
                                    onChange={e => setEditingName(e.target.value)}
                                    onKeyDown={handleTeamNameKeyDown}
                                    onBlur={saveEditing}
                                />
                            ) : (
                                <button
                                    type="button"
                                    className="text-left text-sm font-semibold text-sky-50 hover:text-sky-200"
                                    onClick={e => startEditingTeam(team, e)}
                                >
                                    {team.name}
                                </button>
                            )}
                            <div className="flex items-center gap-2 text-[11px] text-slate-400">
                                <span>{team.members.length} members</span>
                                {typeof team.score === 'number' && (
                                    <span className="rounded-full bg-slate-950/80 px-2 py-[2px] text-[10px] text-sky-200">
                    Score {team.score.toFixed(1)}
                  </span>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-1">
                            {onDeleteTeam && (
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button
                                            size="icon"
                                            variant="outline"
                                            className="h-8 w-8 border-rose-500/60 bg-rose-500/10 text-rose-100 hover:bg-rose-500/20"
                                            aria-label="Delete team"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent className="border border-rose-500/40 bg-slate-950">
                                        <AlertDialogHeader>
                                            <AlertDialogTitle className="text-rose-100">
                                                Delete team?
                                            </AlertDialogTitle>
                                            <AlertDialogDescription className="text-sky-200/80">
                                                This will permanently remove the team{' '}
                                                <span className="font-semibold">"{team.name}"</span> and
                                                detach all its members from this team layout. This
                                                action cannot be undone.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel className="border-slate-600 bg-slate-900 text-sky-100 hover:bg-slate-800">
                                                Cancel
                                            </AlertDialogCancel>
                                            <AlertDialogAction
                                                className="border border-rose-500/60 bg-rose-600/90 text-rose-50 hover:bg-rose-500"
                                                onClick={() => onDeleteTeam(team.id)}
                                            >
                                                Delete team
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            )}
                        </div>
                    </div>

                    {/* Members list */}
                    <div className="flex flex-1 flex-col gap-2 px-3 py-3">
                        {team.members.length === 0 && (
                            <div className="rounded-xl border border-dashed border-slate-700/70 bg-slate-950/70 px-3 py-4 text-center text-[11px] text-slate-400">
                                Drag participants here to add to this team.
                            </div>
                        )}

                        <div className="flex flex-col gap-2">
                            {team.members.map(member => renderMemberCard(team, member))}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    )
}

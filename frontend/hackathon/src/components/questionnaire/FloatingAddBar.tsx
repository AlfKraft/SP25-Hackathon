// src/components/questionnaire/FloatingAddBar.tsx
import { Button } from "@/components/ui/button"
import { Type, SlidersHorizontal, List, ListChecks } from "lucide-react"

interface Props {
    onAdd: (kind: "TEXT" | "NUMBER_SLIDER" | "SINGLE_CHOICE" | "MULTI_CHOICE" | "NUMBER_INPUT" | "LONG_TEXT") => void
}

export function FloatingAddBar({ onAdd }: Props) {
    return (
        <div
            className="
        fixed right-4 bottom-6 z-50
        flex flex-col gap-2
        p-3 rounded-xl border border-sky-500/30
        bg-slate-900/80 backdrop-blur-xl shadow-[0_4px_30px_rgba(0,0,0,0.4)]
      "
        >
            <p className="text-xs text-sky-100/70">Add a new question</p>
            <Button
                size="sm"
                variant="outline"
                className="border-sky-500/40 text-[11px]"
                onClick={() => onAdd("TEXT")}
            >
                <Type className="mr-1 h-4 w-4" /> Text
            </Button>
            <Button
                size="sm"
                variant="outline"
                className="border-sky-500/40 text-[11px]"
                onClick={() => onAdd("LONG_TEXT")}
            >
                <Type className="mr-1 h-4 w-4" /> Long Text
            </Button>
            <Button
                size="sm"
                variant="outline"
                className="border-sky-500/40 text-[11px]"
                onClick={() => onAdd('NUMBER_INPUT')}
            >
                <SlidersHorizontal className="mr-1 h-4 w-4" />
                Numeric field
            </Button>
            <Button
                size="sm"
                variant="outline"
                className="border-sky-500/40 text-[11px]"
                onClick={() => onAdd("NUMBER_SLIDER")}
            >
                <SlidersHorizontal className="mr-1 h-4 w-4" /> Slider
            </Button>

            <Button
                size="sm"
                variant="outline"
                className="border-sky-500/40 text-[11px]"
                onClick={() => onAdd("SINGLE_CHOICE")}
            >
                <List className="mr-1 h-4 w-4" /> One choice
            </Button>

            <Button
                size="sm"
                variant="outline"
                className="border-sky-500/40 text-[11px]"
                onClick={() => onAdd("MULTI_CHOICE")}
            >
                <ListChecks className="mr-1 h-4 w-4" /> Multi-choice
            </Button>
        </div>
    )
}

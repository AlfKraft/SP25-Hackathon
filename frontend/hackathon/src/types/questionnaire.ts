// src/types/questionnaire.ts
export type QuestionKind =
    | 'TEXT'
    | 'LONG_TEXT'
    | 'NUMBER_SLIDER'
    | 'NUMBER_INPUT'
    | 'SINGLE_CHOICE'
    | 'MULTI_CHOICE'

export interface BaseQuestion {
    id: string
    key: string
    label: string
    type: QuestionKind
    required: boolean
    description?: string
    systemRequired?: boolean
    order: number
}

export interface TextQuestion extends BaseQuestion {
    type: 'TEXT'
    maxLength?: number
}

export interface LongTextQuestion extends BaseQuestion {
    type: 'LONG_TEXT'
    maxLength?: number
}

export interface NumberInputQuestion extends BaseQuestion {
    type: 'NUMBER_INPUT'
    min?: number
    max?: number
    step?: number
}

export interface SliderQuestion extends BaseQuestion {
    type: 'NUMBER_SLIDER'
    min: number
    max: number
    step: number
    showValue: boolean
}

export interface ChoiceOption {
    id: string
    label: string
}

export interface SingleChoiceQuestion extends BaseQuestion {
    type: 'SINGLE_CHOICE'
    options: ChoiceOption[]
    randomizeOptions: boolean
}

export interface MultiChoiceQuestion extends BaseQuestion {
    type: 'MULTI_CHOICE'
    options: ChoiceOption[]
    randomizeOptions: boolean
    maxSelections?: number
}

export type Question =
    | TextQuestion
    | LongTextQuestion
    | SliderQuestion
    | NumberInputQuestion
    | SingleChoiceQuestion
    | MultiChoiceQuestion
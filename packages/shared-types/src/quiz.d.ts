export interface QuizQuestion {
    id: string;
    prompt: string;
    choices: string[];
    correctIndex: number;
    /** The Thing this question was generated from, for traceability. */
    sourceThingId: string;
}
export interface QuizAttempt {
    userId: string;
    questionIds: string[];
    answers: number[];
    passed: boolean;
    attemptedAt: string;
}
//# sourceMappingURL=quiz.d.ts.map
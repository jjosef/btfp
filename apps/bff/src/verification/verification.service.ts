import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { QuizQuestion } from '@btfp/shared-types';
import { SearchService } from '../search/search.service.js';
import { SAFE_PLANT_NAMES } from './quiz-bank.js';

const QUESTIONS_PER_QUIZ = 3;
const CHOICES_PER_QUESTION = 4;

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = copy[i]!;
    copy[i] = copy[j]!;
    copy[j] = temp;
  }
  return copy;
}

@Injectable()
export class VerificationService {
  constructor(private readonly search: SearchService) {}

  /** In-memory only: the quiz is regenerated and re-checked per attempt, never persisted. */
  async generateQuiz(): Promise<QuizQuestion[]> {
    const things = await this.search.all();
    const dangerous = shuffle(things).slice(0, QUESTIONS_PER_QUIZ);
    const safeChoices = shuffle([...SAFE_PLANT_NAMES]);

    return dangerous.map((thing, i) => {
      const distractors = safeChoices.slice(
        i * (CHOICES_PER_QUESTION - 1),
        i * (CHOICES_PER_QUESTION - 1) + (CHOICES_PER_QUESTION - 1),
      );
      const choices = shuffle([thing.name, ...distractors]);
      return {
        id: randomUUID(),
        prompt: 'Which of these is dangerous for a dog?',
        choices,
        correctIndex: choices.indexOf(thing.name),
        sourceThingId: thing.id,
      } satisfies QuizQuestion;
    });
  }

  gradeQuiz(questions: QuizQuestion[], answers: number[]): boolean {
    if (answers.length !== questions.length) return false;
    return questions.every((q, i) => answers[i] === q.correctIndex);
  }
}

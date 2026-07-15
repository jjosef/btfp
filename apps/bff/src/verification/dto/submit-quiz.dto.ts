import { Type } from 'class-transformer';
import { IsArray, IsInt, IsNumber, IsString, ValidateNested } from 'class-validator';

class QuizQuestionInputDto {
  @IsString()
  id!: string;

  @IsString()
  prompt!: string;

  @IsArray()
  @IsString({ each: true })
  choices!: string[];

  @IsInt()
  correctIndex!: number;

  @IsString()
  sourceThingId!: string;
}

export class SubmitQuizDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuizQuestionInputDto)
  questions!: QuizQuestionInputDto[];

  @IsArray()
  @IsNumber({}, { each: true })
  answers!: number[];
}

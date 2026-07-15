import { IsArray, IsObject, IsOptional, IsString } from 'class-validator';

export class CreatePetTypeDto {
  @IsString()
  name!: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  aliases?: string[];

  @IsObject()
  @IsOptional()
  details?: Record<string, unknown>;
}

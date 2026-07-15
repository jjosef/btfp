import { IsObject, IsOptional, IsString } from 'class-validator';

export class CreateThingTypeDto {
  @IsString()
  name!: string;

  @IsString()
  description!: string;

  @IsObject()
  @IsOptional()
  details?: Record<string, unknown>;
}

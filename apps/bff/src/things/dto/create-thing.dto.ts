import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  ValidateNested,
} from 'class-validator';
import type { Severity } from '@btfp/shared-types';

const SEVERITIES: Severity[] = ['mild', 'moderate', 'severe', 'unknown'];

export class PetToxicityDto {
  @IsString()
  petTypeId!: string;

  @IsIn(SEVERITIES)
  severity!: Severity;
}

export class CreateThingDto {
  @IsString()
  name!: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  otherNames?: string[];

  @IsString()
  thingTypeId!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PetToxicityDto)
  petTypes!: PetToxicityDto[];

  @IsObject()
  @IsOptional()
  details?: Record<string, unknown>;

  @IsString()
  source!: string;

  @IsUrl()
  @IsOptional()
  sourceUrl?: string;
}

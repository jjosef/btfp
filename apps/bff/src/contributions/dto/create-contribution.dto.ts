import { IsOptional, IsString } from 'class-validator';
import { CreateThingDto } from '../../things/dto/create-thing.dto.js';

export class CreateContributionDto {
  /** Set to propose an edit to an existing thing; omit for a brand-new thing. */
  @IsString()
  @IsOptional()
  thingId?: string;

  payload!: CreateThingDto;
}

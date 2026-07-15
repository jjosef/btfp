export type Severity = 'mild' | 'moderate' | 'severe' | 'unknown';

export interface PetToxicity {
  petTypeId: string;
  severity: Severity;
}

export interface Thing {
  id: string;
  name: string;
  otherNames: string[];
  thingTypeId: string;
  petTypes: PetToxicity[];
  /** Unstructured facts: toxic principles, clinical signs, dose notes, family, etc. */
  details: Record<string, unknown>;
  source: string;
  sourceUrl?: string;
  verified: boolean;
  contributorId?: string;
  createdAt: string;
  updatedAt: string;
}

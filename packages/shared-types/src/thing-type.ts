export interface ThingType {
  id: string;
  name: string;
  description: string;
  /** Free-form schema hints for this type, e.g. which `details` keys are expected. */
  details: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

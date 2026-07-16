const DYNAMO_KEYS = ['PK', 'SK', 'GSI1PK', 'GSI1SK', 'GSI2PK', 'GSI2SK'] as const;

/** Strips DynamoDB's own key/index attributes before returning an item over the public API. */
export function stripDynamoKeys<T extends Record<string, unknown>>(
  item: T,
): Omit<T, (typeof DYNAMO_KEYS)[number]> {
  const clean = { ...item };
  for (const key of DYNAMO_KEYS) delete clean[key];
  return clean;
}

import { Global, Module } from '@nestjs/common';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { DYNAMO_DOC_CLIENT } from './dynamo.constants.js';

/**
 * Points at DynamoDB Local when DYNAMODB_ENDPOINT is set (local dev), or real
 * DynamoDB via the Lambda execution role otherwise.
 */
@Global()
@Module({
  providers: [
    {
      provide: DYNAMO_DOC_CLIENT,
      useFactory: () => {
        const endpoint = process.env.DYNAMODB_ENDPOINT;
        const client = new DynamoDBClient({
          region: process.env.AWS_REGION ?? 'us-east-1',
          ...(endpoint
            ? { endpoint, credentials: { accessKeyId: 'local', secretAccessKey: 'local' } }
            : {}),
        });
        return DynamoDBDocumentClient.from(client, {
          marshallOptions: { removeUndefinedValues: true },
        });
      },
    },
  ],
  exports: [DYNAMO_DOC_CLIENT],
})
export class DynamoModule {}

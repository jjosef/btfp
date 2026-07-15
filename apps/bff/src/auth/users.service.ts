import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { GetCommand, PutCommand, UpdateCommand, DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import type { User } from '@btfp/shared-types';
import { DYNAMO_DOC_CLIENT, USERS_TABLE_NAME } from '../dynamo/dynamo.constants.js';
import type { OAuthProfile } from './auth.types.js';

@Injectable()
export class UsersService {
  constructor(@Inject(DYNAMO_DOC_CLIENT) private readonly db: DynamoDBDocumentClient) {}

  private pk(provider: string, providerAccountId: string): string {
    return `USER#${provider}#${providerAccountId}`;
  }

  async getByProviderAccount(provider: string, providerAccountId: string): Promise<User | null> {
    const result = await this.db.send(
      new GetCommand({ TableName: USERS_TABLE_NAME, Key: { PK: this.pk(provider, providerAccountId) } }),
    );
    return (result.Item as User | undefined) ?? null;
  }

  async upsertFromOAuth(profile: OAuthProfile): Promise<User> {
    const existing = await this.getByProviderAccount(profile.provider, profile.providerAccountId);
    const now = new Date().toISOString();

    const user: User = {
      id: existing?.id ?? randomUUID(),
      provider: profile.provider,
      providerAccountId: profile.providerAccountId,
      displayName: profile.displayName,
      avatarUrl: profile.avatarUrl,
      email: profile.email,
      providerAccountCreatedAt: profile.providerAccountCreatedAt ?? existing?.providerAccountCreatedAt,
      verifiedContributor: existing?.verifiedContributor ?? false,
      verifiedAt: existing?.verifiedAt,
      createdAt: existing?.createdAt ?? now,
    };

    await this.db.send(
      new PutCommand({
        TableName: USERS_TABLE_NAME,
        Item: { ...user, PK: this.pk(user.provider, user.providerAccountId) },
      }),
    );

    return user;
  }

  async markVerified(provider: string, providerAccountId: string): Promise<void> {
    await this.db.send(
      new UpdateCommand({
        TableName: USERS_TABLE_NAME,
        Key: { PK: this.pk(provider, providerAccountId) },
        UpdateExpression: 'SET verifiedContributor = :true, verifiedAt = :now',
        ExpressionAttributeValues: { ':true': true, ':now': new Date().toISOString() },
      }),
    );
  }
}

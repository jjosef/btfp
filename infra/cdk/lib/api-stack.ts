import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigwv2 from 'aws-cdk-lib/aws-apigatewayv2';
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { EnvConfig } from './config.js';
import {
  BEDROCK_INFERENCE_PROFILE_ID,
  BRAVE_SEARCH_API_KEY,
  DEV_JWT_SECRET,
  GITHUB_CLIENT_ID,
  GITHUB_CLIENT_SECRET_PARAM_NAME,
  PROD_JWT_SECRET,
  ROOT_DOMAIN,
  SES_FROM_ADDRESS,
} from './config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface ApiStackProps extends cdk.StackProps {
  envConfig: EnvConfig;
  contentTable: dynamodb.Table;
  usersTable: dynamodb.Table;
}

/**
 * One Lambda running the whole NestJS BFF behind an HTTP API (cheaper than
 * REST API). CloudFront (in WebStack) fronts this at /api/*, so there's no
 * custom domain or ACM cert on the API Gateway itself.
 */
export class ApiStack extends cdk.Stack {
  readonly httpApi: apigwv2.HttpApi;

  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);

    const isProd = props.envConfig.envName === 'prod';

    // GitHub OAuth app is only registered for prod right now (see
    // config.ts) — dev gets none of these env vars and GithubStrategy just
    // falls back to its "not-configured" placeholder, same as before.
    const githubEnv: Record<string, string> = isProd
      ? {
          GITHUB_CLIENT_ID,
          GITHUB_CLIENT_SECRET_PARAM: GITHUB_CLIENT_SECRET_PARAM_NAME,
          GITHUB_CALLBACK_URL: `https://${ROOT_DOMAIN}/api/auth/github/callback`,
        }
      : {};

    const handler = new lambda.Function(this, 'BffFunction', {
      functionName: `btfp-${props.envConfig.envName}-bff`,
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'lambda.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../../apps/bff/dist')),
      memorySize: 512,
      timeout: cdk.Duration.seconds(15),
      environment: {
        NODE_ENV: 'production',
        STAGE: props.envConfig.envName,
        CONTENT_TABLE_NAME: props.contentTable.tableName,
        USERS_TABLE_NAME: props.usersTable.tableName,
        SES_FROM_ADDRESS,
        BEDROCK_INFERENCE_PROFILE_ID,
        JWT_SECRET: isProd ? PROD_JWT_SECRET : DEV_JWT_SECRET,
        BRAVE_SEARCH_API_KEY,
        // Was missing entirely — fell back to its localhost default in every
        // deployed environment, so the OAuth callback and /auth/logout
        // redirected real visitors' browsers to http://localhost:5173.
        WEB_ORIGIN: `https://${props.envConfig.domainName}`,
        ...githubEnv,
      },
    });

    props.contentTable.grantReadWriteData(handler);
    props.usersTable.grantReadWriteData(handler);

    if (isProd) {
      ssm.StringParameter.fromSecureStringParameterAttributes(this, 'GithubClientSecretParam', {
        parameterName: GITHUB_CLIENT_SECRET_PARAM_NAME,
      }).grantRead(handler);
    }

    // In SES sandbox mode, SendEmail is authorized against BOTH the sending
    // identity (our domain) and the recipient's identity ARN when that
    // recipient is itself a verified identity — which every sandbox test
    // recipient necessarily is. Scoping this to just the domain identity
    // works in production SES but 403s in sandbox, so wildcard the resource
    // instead of trying to enumerate recipients.
    handler.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['ses:SendEmail', 'ses:SendRawEmail'],
        resources: [`arn:aws:ses:${this.region}:${this.account}:identity/*`],
      }),
    );

    // Cross-region inference profiles need permission on both the profile
    // itself and the underlying foundation models it can route requests to.
    handler.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['bedrock:InvokeModel'],
        resources: [
          `arn:aws:bedrock:${this.region}:${this.account}:inference-profile/${BEDROCK_INFERENCE_PROFILE_ID}`,
          'arn:aws:bedrock:*::foundation-model/anthropic.claude-*',
        ],
      }),
    );

    this.httpApi = new apigwv2.HttpApi(this, 'HttpApi', {
      apiName: `btfp-${props.envConfig.envName}-api`,
      defaultIntegration: new HttpLambdaIntegration('BffIntegration', handler),
    });

    new cdk.CfnOutput(this, 'HttpApiUrl', { value: this.httpApi.apiEndpoint });
  }
}

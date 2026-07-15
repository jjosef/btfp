import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as targets from 'aws-cdk-lib/aws-route53-targets';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as wafv2 from 'aws-cdk-lib/aws-wafv2';
import * as apigwv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { EnvConfig } from './config.js';
import { HOSTED_ZONE_ID, ROOT_DOMAIN } from './config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface WebStackProps extends cdk.StackProps {
  envConfig: EnvConfig;
  httpApi: apigwv2.HttpApi;
}

/**
 * Private S3 bucket + CloudFront (OAC) for the static React app, WAF at the
 * CloudFront layer covering both static and /api/* traffic, and the Route53
 * alias record(s) for this stage's domain name(s).
 */
export class WebStack extends cdk.Stack {
  readonly distribution: cloudfront.Distribution;
  readonly siteBucket: s3.Bucket;

  constructor(scope: Construct, id: string, props: WebStackProps) {
    super(scope, id, props);

    const hostedZone = route53.PublicHostedZone.fromHostedZoneAttributes(this, 'HostedZone', {
      hostedZoneId: HOSTED_ZONE_ID,
      zoneName: ROOT_DOMAIN,
    });

    const isProd = props.envConfig.envName === 'prod';

    this.siteBucket = new s3.Bucket(this, 'SiteBucket', {
      bucketName: `btfp-${props.envConfig.envName}-site`,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: isProd ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: !isProd,
    });

    const allDomainNames = [props.envConfig.domainName, ...props.envConfig.aliasDomainNames];

    const certificate = new acm.Certificate(this, 'Certificate', {
      domainName: props.envConfig.domainName,
      subjectAlternativeNames: props.envConfig.aliasDomainNames,
      validation: acm.CertificateValidation.fromDns(hostedZone),
    });

    // Kept to two rule groups (~$6-8/mo) to stay within budget; see docs/infra.md.
    const webAcl = new wafv2.CfnWebACL(this, 'WebAcl', {
      scope: 'CLOUDFRONT',
      defaultAction: { allow: {} },
      visibilityConfig: {
        cloudWatchMetricsEnabled: true,
        metricName: `btfp-${props.envConfig.envName}-waf`,
        sampledRequestsEnabled: true,
      },
      rules: [
        {
          name: 'AWS-CommonRuleSet',
          priority: 0,
          overrideAction: { none: {} },
          statement: {
            managedRuleGroupStatement: {
              vendorName: 'AWS',
              name: 'AWSManagedRulesCommonRuleSet',
            },
          },
          visibilityConfig: {
            cloudWatchMetricsEnabled: true,
            metricName: `btfp-${props.envConfig.envName}-common`,
            sampledRequestsEnabled: true,
          },
        },
        {
          name: 'RateLimit',
          priority: 1,
          action: { block: {} },
          statement: {
            rateBasedStatement: { limit: 2000, aggregateKeyType: 'IP' },
          },
          visibilityConfig: {
            cloudWatchMetricsEnabled: true,
            metricName: `btfp-${props.envConfig.envName}-ratelimit`,
            sampledRequestsEnabled: true,
          },
        },
      ],
    });

    // HttpApi.apiEndpoint is "https://{id}.execute-api.{region}.amazonaws.com"; CloudFront needs just the host.
    const apiDomain = cdk.Fn.select(2, cdk.Fn.split('/', props.httpApi.apiEndpoint));

    this.distribution = new cloudfront.Distribution(this, 'Distribution', {
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(this.siteBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
      },
      additionalBehaviors: {
        '/api/*': {
          origin: new origins.HttpOrigin(apiDomain, {
            protocolPolicy: cloudfront.OriginProtocolPolicy.HTTPS_ONLY,
          }),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
          originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
        },
      },
      domainNames: allDomainNames,
      certificate,
      webAclId: webAcl.attrArn,
      defaultRootObject: 'index.html',
      errorResponses: [{ httpStatus: 404, responseHttpStatus: 200, responsePagePath: '/index.html' }],
    });

    for (const domainName of allDomainNames) {
      new route53.ARecord(this, `AliasRecord-${domainName}`, {
        zone: hostedZone,
        recordName: domainName,
        target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(this.distribution)),
      });
    }

    new s3deploy.BucketDeployment(this, 'DeploySite', {
      sources: [s3deploy.Source.asset(path.join(__dirname, '../../../apps/web/dist'))],
      destinationBucket: this.siteBucket,
      distribution: this.distribution,
      distributionPaths: ['/*'],
    });

    new cdk.CfnOutput(this, 'DistributionDomainName', { value: this.distribution.distributionDomainName });
    new cdk.CfnOutput(this, 'SiteBucketName', { value: this.siteBucket.bucketName });
  }
}

export const ROOT_DOMAIN = 'badthingsforpets.com';

// Everything lives in us-east-1: required for CloudFront's ACM cert and its
// CLOUDFRONT-scope WAF WebACL, and simplest for a single-region MVP.
export const AWS_REGION = 'us-east-1';
export const AWS_ACCOUNT = process.env.CDK_DEFAULT_ACCOUNT;

// Set after `cdk deploy BtfpDns` once, from its HostedZoneId output.
export const HOSTED_ZONE_ID = process.env.BTFP_HOSTED_ZONE_ID ?? 'REPLACE_AFTER_DNS_STACK_DEPLOY';

export interface EnvConfig {
  envName: 'dev' | 'prod';
  domainName: string;
  aliasDomainNames: string[];
}

export const environments: Record<'dev' | 'prod', EnvConfig> = {
  dev: {
    envName: 'dev',
    domainName: `dev.${ROOT_DOMAIN}`,
    aliasDomainNames: [],
  },
  prod: {
    envName: 'prod',
    domainName: ROOT_DOMAIN,
    aliasDomainNames: [`www.${ROOT_DOMAIN}`],
  },
};

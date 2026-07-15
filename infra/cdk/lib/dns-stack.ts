import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as route53 from 'aws-cdk-lib/aws-route53';

export interface DnsStackProps extends cdk.StackProps {
  domainName: string;
}

/**
 * Deployed once, standalone. Its NS output is what you set at the registrar
 * to delegate the domain to Route53.
 */
export class DnsStack extends cdk.Stack {
  readonly hostedZone: route53.PublicHostedZone;

  constructor(scope: Construct, id: string, props: DnsStackProps) {
    super(scope, id, props);

    this.hostedZone = new route53.PublicHostedZone(this, 'HostedZone', {
      zoneName: props.domainName,
    });

    new cdk.CfnOutput(this, 'NameServers', {
      value: cdk.Fn.join(', ', this.hostedZone.hostedZoneNameServers ?? []),
      description: 'Set these as the NS records at your domain registrar',
    });

    new cdk.CfnOutput(this, 'HostedZoneId', {
      value: this.hostedZone.hostedZoneId,
      description: 'Set as BTFP_HOSTED_ZONE_ID before deploying the app stages',
    });
  }
}

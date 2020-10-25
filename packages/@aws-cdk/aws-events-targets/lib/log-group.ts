import * as events from '@aws-cdk/aws-events';
import * as iam from '@aws-cdk/aws-iam';
import * as logs from '@aws-cdk/aws-logs';
import * as cdk from '@aws-cdk/core';
import { LogGroupResourcePolicy } from './log-group-resource-policy';
/**
 * Customize the CloudWatch LogGroup Event Target
 */
export interface LogGroupProps {
  /**
   * The event to send to the CloudWatch LogGroup
   *
   * This will be the event logged into the CloudWatch LogGroup
   *
   * @default - the entire EventBridge event
   */
  readonly event?: events.RuleTargetInput;
}

/**
 * Use an AWS CloudWatch LogGroup as an event rule target.
 */
export class LogGroup implements events.IRuleTarget {
  constructor(private readonly logGroup: logs.ILogGroup, private readonly props: LogGroupProps = {}) {}

  /**
   * Returns a RuleTarget that can be used to log an event into a CloudWatch LogGroup
   */
  public bind(_rule: events.IRule, _id?: string): events.RuleTargetConfig {
    // Use a custom resource to set the log group resource policy since it is not supported by CDK and cfn.
    // https://github.com/aws/aws-cdk/issues/5343
    const resourcePolicyId = `EventsLogGroupPolicy${_rule.node.uniqueId}`;
    if (!this.logGroup.node.tryFindChild(resourcePolicyId)) {
      new LogGroupResourcePolicy(cdk.Stack.of(this.logGroup), resourcePolicyId, {
        policyName: `${this.logGroup.logGroupName}EventsLogPolicy`,
        policyStatements: [new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ['logs:PutLogEvents', 'logs:CreateLogStream'],
          resources: [this.logGroup.logGroupArn],
          principals: [new iam.ServicePrincipal('events.amazonaws.com')],
        })],
      });
    }

    return {
      id: '',
      arn: `arn:aws:logs:${this.logGroup.stack.region}:${this.logGroup.stack.account}:log-group:${this.logGroup.logGroupName}`,
      input: this.props.event,
      targetResource: this.logGroup,
    };
  }
}

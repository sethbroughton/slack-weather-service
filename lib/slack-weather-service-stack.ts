import * as cdk from '@aws-cdk/core';
import * as apigateway from '@aws-cdk/aws-apigatewayv2'
import * as integrations from '@aws-cdk/aws-apigatewayv2-integrations'
import { NodejsFunction } from '@aws-cdk/aws-lambda-nodejs';
import * as lambda from '@aws-cdk/aws-lambda'
import * as logs from '@aws-cdk/aws-logs';
import * as events from '@aws-cdk/aws-events'
import * as path from 'path';

export class SlackWeatherServiceStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const handler = new NodejsFunction(this, 'handler', {
      entry: path.join(__dirname, '..', 'lambda-fns', 'event-handler', 'index.ts'),
      runtime: lambda.Runtime.NODEJS_14_X,
      logRetention: logs.RetentionDays.ONE_WEEK,
      environment: {
        SLACK_SIGNING_SECRET: cdk.SecretValue.secretsManager('slack-weather').toString()
      }
    })

    const httpApi = new apigateway.HttpApi(this, 'SlackApi', {
      defaultIntegration: new integrations.LambdaProxyIntegration({
        handler,
      }
      )
    })

    events.EventBus.grantAllPutEvents(handler);
    
    new cdk.CfnOutput(this, "ApiEndpoint", {
      value: httpApi.apiEndpoint,
      exportName: "ApiEndpoint"
    })
  }
}

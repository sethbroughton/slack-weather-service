import { EventBridge } from 'aws-sdk';
import { verifyRequestSignature } from './signature'

export async function handler(event: any): Promise<any> {
    console.log(JSON.stringify(event, undefined, 2));

    const response = {
        statusCode: 200,
        body: '',
    }
    try {
        if (!process.env.SLACK_SIGNING_SECRET) throw new Error('The environment variable SLACK_SIGNING_SECRET is not defined');

        if (!event.body) throw new Error('Missing body');

        if (!event.headers['x-slack-signature']) throw new Error('Missing X-Slack-Signature');

        if (!event.headers['x-slack-request-timestamp']) throw new Error('Missing X-Slack-Request-Timestamp');

        if (!verifyRequestSignature({
            body: event.body,
            requestSignature: event.headers['x-slack-signature'],
            requestTimestamp: parseInt(event.headers['x-slack-request-timestamp'], 10),
            signingSecret: process.env.SLACK_SIGNING_SECRET,
        })) {
            response.statusCode = 403;
            return response;
        }

        const body = JSON.parse(event.body);
        console.log('Body: %j', body);

        if (body.type === 'url_verification') { // Slack URL verification, respond with challenge
            console.log('URL verification');
            response.body = JSON.stringify({ challenge: body.challenge });
            return response;
        }

        const eventBridge = new EventBridge({ apiVersion: '2015-10-07' });

        const putEvents = await eventBridge.putEvents({
            Entries: [
                {
                    Detail: event.body,
                    DetailType: 'Slack Event',
                    Source: 'slack',
                    Resources: [body.api_app_id],
                    Time: new Date(body.event_time),
                },
            ],
        }).promise();
        console.log('Put events: %j', putEvents);

        return response;
    } catch (err) {
        console.log(err);
        response.statusCode = 500;
        return response;
    }
}


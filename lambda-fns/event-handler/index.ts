import { verifyRequestSignature } from './signature';
import { EventBridge } from 'aws-sdk';
exports.handler = async function (event:any) {
    console.log('Event: ' + JSON.stringify(event, undefined, 2));

    const response: any = {
        statusCode: 200,
        body: "Generating the report..."
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

        const body = event.body;
        console.log('Body: ' + body);

        const eventBridge = new EventBridge({ apiVersion: '2015-10-07' });

        const putEvents = await eventBridge.putEvents({
            Entries: [
                {
                    Detail: JSON.stringify({"event": body}),
                    DetailType: 'Slack Event',
                    Source: 'slack',
                    EventBusName: process.env.EVENT_BUS_NAME
                    // Resources: [body.user_name],
                    // Time: new Date(body.event_time)
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
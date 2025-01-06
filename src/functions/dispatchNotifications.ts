import { app, InvocationContext, output } from "@azure/functions";

import { DefaultLogger, SystemLogger } from '../common/logger';
import { ServiceHealthImpact, HtmlNotification } from "../common/interfaces";
import { formatNotification } from "../controllers/notifications";
import { _getString } from "../common/apperror";

const notificationBlobOutput = output.storageBlob({
    path: 'health-notifications-history/n-{DateTime}-{rand-guid}.html',
    connection: 'AzureWebJobsStorage'
});

const emailQueueOutput = output.storageQueue({
    queueName: 'notifications-email',
    connection: 'AzureWebJobsStorage'
});

const itsmQueueOutput = output.storageQueue({
    queueName: 'notifications-itsm',
    connection: 'AzureWebJobsStorage'
});

const devopsQueueOutput = output.storageQueue({
    queueName: 'notifications-devops',
    connection: 'AzureWebJobsStorage'
});

const otherQueueOutput = output.storageQueue({
    queueName: 'notifications-other',
    connection: 'AzureWebJobsStorage'
});


export async function dispatchNotifications(queueItem: ServiceHealthImpact, context: InvocationContext): Promise<void> {
    //context.log('Storage queue notifications function processed work item:', queueItem);

    SystemLogger.setLogger(new DefaultLogger(true));

    let notification: HtmlNotification;
    try {
        // Format notification
        notification = formatNotification(queueItem);

        //
        // Dispatch notifications to corresponding sender type queues
        //
        const senders = process.env.NOTIFICATION_SENDERS.split(',');
        if (senders.indexOf("email") > -1) {
            context.extraOutputs.set(emailQueueOutput, queueItem);
        }

        if (senders.indexOf("itsm") > -1) {
            context.extraOutputs.set(itsmQueueOutput, queueItem);
        }

        if (senders.indexOf("devops") > -1) {
            context.extraOutputs.set(devopsQueueOutput, queueItem);
        }

        if (senders.indexOf("other") > -1) {
            context.extraOutputs.set(otherQueueOutput, queueItem);
        }

        // Store notification in archive
        context.extraOutputs.set(notificationBlobOutput, notification.bodyHtml);

    } catch (err) {

        context.error(err);
        // This rethrown exception will only fail the individual invocation, instead of crashing the whole process
        throw err;
    }
}

app.storageQueue('dispatchNotifications', {
    queueName: 'notifications',
    connection: 'AzureWebJobsStorage',
    extraOutputs: [
        notificationBlobOutput,
        emailQueueOutput,
        itsmQueueOutput,
        devopsQueueOutput,
        otherQueueOutput
    ],
    handler: dispatchNotifications
});

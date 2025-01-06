import { app, InvocationContext, output } from "@azure/functions";

import { DefaultLogger, SystemLogger } from '../common/logger';
import { ServiceHealthImpact, HtmlNotification, EmailNotification } from "../common/interfaces";
import { formatNotification } from "../controllers/notifications";
import { sendMail, getEmailConfigFromEnvironment } from "../controllers/email";
import { getNotificationEmailRecipients } from "../controllers/customEmailRecipients";
import { EmailError, Email429Error, _getString } from "../common/apperror";
import { QueueManager } from "../controllers/queue.manager";

const failedEmailQueueOutput = output.storageQueue({
    queueName: 'failed-email',
    connection: 'AzureWebJobsStorage'
});


export async function sendNotificationsEmail(queueItem: ServiceHealthImpact, context: InvocationContext): Promise<void> {
    //context.log('Storage queue notifications function processed work item:', queueItem);

    SystemLogger.setLogger(new DefaultLogger(true));

    let notification: HtmlNotification;
    let mailNotification: EmailNotification;
    try {
        // Format notification
        notification = formatNotification(queueItem);

        //
        // Send notification mail to Application owners
        //

        // Get email keys from keyvault
        const emailConfig = await getEmailConfigFromEnvironment();

        //  Prepare list of recipients (e.g., get application owners e-mails from tags)
        const emailRecipients = await getNotificationEmailRecipients(queueItem , [emailConfig.testOnlyRecipient]);

        if (emailRecipients.length > 0) {
            // Send mail
            mailNotification = {
                senderAddress: emailConfig.senderAddress,
                recipients: emailRecipients,
                subject: queueItem.issue.summary,
                notification: notification
            }
            await sendMail(emailConfig.endpoint, mailNotification);
        }

    } catch (err) {

        // Check id error is related to Tags, ServiceNow or other
        if (err instanceof Email429Error) {
            // Look at the retry-after and define visibilityTimeout for the message
            const retryAfter = err.retryInfo.retryAfter;
            const queueManager = new QueueManager(process.env.AzureWebJobsStorage || "", 'retry-email');
            await queueManager.sendMessage(JSON.stringify(mailNotification), retryAfter);
        }
        else if (err instanceof EmailError) {
            context.extraOutputs.set(failedEmailQueueOutput, err.message);
        }
        else {
            context.error(err);
            // This rethrown exception will only fail the individual invocation, instead of crashing the whole process
            throw err;
        }
    }
}

app.storageQueue('sendNotificationsEmail', {
    queueName: 'notifications-email',
    connection: 'AzureWebJobsStorage',
    extraOutputs: [
        failedEmailQueueOutput
    ],
    handler: sendNotificationsEmail
});

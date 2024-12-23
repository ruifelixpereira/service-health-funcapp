import { app, InvocationContext, output } from "@azure/functions";

import { DefaultLogger, SystemLogger } from '../common/logger';
import { ServiceHealthImpact, HtmlNotification, EmailNotification } from "../common/interfaces";
import { KeyVaultManager } from "../controllers/keyvault.manager";
import { formatNotification } from "../controllers/notifications";
import { MailService } from "../controllers/mailService";

const notificationBlobOutput = output.storageBlob({
    path: 'health-notifications-history/n-{DateTime}-{rand-guid}.html',
    connection: 'AzureWebJobsStorage'
});


export async function sendNotifications(queueItem: ServiceHealthImpact, context: InvocationContext): Promise<void> {
    //context.log('Storage queue notifications function processed work item:', queueItem);

    SystemLogger.setLogger(new DefaultLogger(true));

    let notification: HtmlNotification;
    try {
        // Format notification
        notification = formatNotification(queueItem);

        //
        // Send notification mail to Application owners
        //
        if (process.env.OUTPUT_SEND_MAIL === "true") {

            // Get keys from keyvault
            const kvManager = new KeyVaultManager();

            // TODO: get application owners e-mails from tags (recipients)

            const mailNotification: EmailNotification = {
                app: "", //resourceGroupTags.app,
                recipients: [""], //recipients,
                subject: queueItem.issue.summary,
                notification: notification
            }

            // Send mail
            const smtpHost = await kvManager.readSecret("servicehealth-smtp-relay-host");
            const smtpPort = await kvManager.readSecret("servicehealth-smtp-relay-port");
            const smtpUser = await kvManager.readSecret("servicehealth-smtp-relay-user");
            const smtpPwd = await kvManager.readSecret("servicehealth-smtp-relay-pass");
            const emailSenderAddress = await kvManager.readSecret("servicehealth-email-sender-address");
            const emailTestOnlyRecipient = await kvManager.readSecret("servicehealth-email-test-only-recipient");

            const mailService = new MailService({
                host: smtpHost,
                port: smtpPort,
                user: smtpUser,
                pwd: smtpPwd,
                emailSenderAddress: emailSenderAddress
            });
            await mailService.sendMail(context.invocationId, {
                to: mailNotification.recipients,
                subject: mailNotification.subject,
                html: mailNotification.notification.bodyHtml
            },
            emailTestOnlyRecipient);
        }

        // Store notification in archive
        context.extraOutputs.set(notificationBlobOutput, notification.bodyHtml);

    } catch (err) {
        context.error(err);
        // This rethrown exception will only fail the individual invocation, instead of crashing the whole process
        throw err;
    }
}

app.storageQueue('sendNotifications', {
    queueName: 'notifications',
    connection: 'AzureWebJobsStorage',
    extraOutputs: [
        notificationBlobOutput
    ],
    handler: sendNotifications
});

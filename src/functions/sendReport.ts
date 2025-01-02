import { app, InvocationContext, output } from "@azure/functions";

import { DefaultLogger, SystemLogger } from '../common/logger';
import { ServiceHealthImpact, HtmlNotification, EmailNotification } from "../common/interfaces";
import { EmailError, Email429Error } from "../common/apperror";
import { KeyVaultManager } from "../controllers/keyvault.manager";
import { QueueManager } from "../controllers/queue.manager";
import { sendMail } from "../controllers/email";
import { formatReport } from "../controllers/reports";


const reportBlobOutput = output.storageBlob({
    path: 'health-report-history/r-{DateTime}-{rand-guid}.html',
    connection: 'AzureWebJobsStorage'
});

const failedEmailQueueOutput = output.storageQueue({
    queueName: 'failed-email',
    connection: 'AzureWebJobsStorage'
});


export async function sendReport(blob: Buffer, context: InvocationContext): Promise<void> {

    SystemLogger.setLogger(new DefaultLogger(true));

    let report: HtmlNotification;
    let mailNotification: EmailNotification;
    try {
        // Parse blob to JSON
        const healthEvents: Array<ServiceHealthImpact> = JSON.parse(blob.toString('utf-8'));

        // Format notification
        report = formatReport(healthEvents);

        //
        // Send notification mail to Application owners
        //
        if (process.env.OUTPUT_SEND_MAIL === "true") {

            // Get keys from keyvault
            const kvManager = new KeyVaultManager();
            const emailEndpoint = await kvManager.readSecret("servicehealth-email-endpoint"); // "https://<resource-name>.communication.azure.com";
            const emailSenderAddress = await kvManager.readSecret("servicehealth-email-sender-address");
            const emailTestOnlyRecipient = await kvManager.readSecret("servicehealth-email-test-only-recipient");

            // TODO: Prepare list of recipients: get application owners e-mails from tags
            // For now let's just send to a test recipient
            // const emailRecipients = await getAppOwnersEmails(healthEvents);
            const emailRecipients = [emailTestOnlyRecipient];

            // Send mail
            mailNotification = {
                senderAddress: emailSenderAddress,
                recipients: emailRecipients,
                subject: "Azure Service Health report",
                notification: report
            }
            await sendMail(emailEndpoint, mailNotification);
        }

        // Store notification in archive
        context.extraOutputs.set(reportBlobOutput, report.bodyHtml);

    } catch (err) {

        if (err instanceof SyntaxError && err.message === "Unexpected end of JSON input") {
            // Ignore because it's caused by the function to fire when the blob is created and stiil not yet completely uploaded.
            return;
        }
        else if (err instanceof Email429Error) {
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

app.storageBlob('sendReport', {
    path: 'health-reports/{name}',
    connection: 'AzureWebJobsStorage',
    extraOutputs: [
        reportBlobOutput,
        failedEmailQueueOutput
    ],
    handler: sendReport,
});

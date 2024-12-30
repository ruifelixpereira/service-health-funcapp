import { app, InvocationContext, output } from "@azure/functions";

import { DefaultLogger, SystemLogger } from '../common/logger';
import { ServiceHealthImpact, HtmlNotification, EmailNotification } from "../common/interfaces";
import { KeyVaultManager } from "../controllers/keyvault.manager";
import { formatReport } from "../controllers/reports";
import { MailService } from "../controllers/mailService";

const reportBlobOutput = output.storageBlob({
    path: 'health-report-history/r-{DateTime}-{rand-guid}.html',
    connection: 'AzureWebJobsStorage'
});


export async function sendReport(blob: Buffer, context: InvocationContext): Promise<void> {

    SystemLogger.setLogger(new DefaultLogger(true));

    let report: HtmlNotification;
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

            // TODO: get application owners e-mails from tags (recipients)

            const mailNotification: EmailNotification = {
                app: "", //resourceGroupTags.app,
                recipients: [""], //recipients,
                subject: "Azure Service Health report",
                notification: report
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
        context.extraOutputs.set(reportBlobOutput, report.bodyHtml);

    } catch (err) {

        if (err instanceof SyntaxError && err.message === "Unexpected end of JSON input") {
            // Ignore because it's caused by the function to fire when the blob is created and stiil not yet completely uploaded.
            return;
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
        reportBlobOutput
    ],
    handler: sendReport,
});

import * as nodemailer from "nodemailer";
import SMTPTransport = require("nodemailer/lib/smtp-transport");

import { MailInterface, MailServiceOptions } from '../common/interfaces';
import { SystemLogger } from '../common/logger';

export class MailService {
    private transporter: nodemailer.Transporter;
    private emailSenderAddress: string;

    constructor(options: MailServiceOptions) {
        const smtpConfig: SMTPTransport.Options = {
            host: options.host,
            port: parseInt(options.port || '587'),
            secure: false,
            auth: {
                user: options.user,
                pass: options.pwd
            }
        };

        this.emailSenderAddress = options.emailSenderAddress;
        this.transporter = nodemailer.createTransport(smtpConfig);
    }

    //SEND MAIL
    public async sendMail(
        requestId: string | number | string[],
        options: MailInterface,
        testOnlyRecipient?: string
    ) {
        return await this.transporter
            .sendMail({
                from: `${this.emailSenderAddress || options.from}`,
                to: `${testOnlyRecipient || options.to}`,
                cc: options.cc,
                bcc: options.bcc,
                subject: options.subject,
                text: options.text,
                html: options.html,
            })
            .then((info) => {
                SystemLogger.info(`${requestId} - Mail sent successfully!!`);
                SystemLogger.info(`${requestId} - [MailResponse]=${info.response} [MessageID]=${info.messageId}`);
                return info;
            });
    }

}
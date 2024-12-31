import * as Handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';
import { ServiceHealthImpact, HtmlNotification } from "../common/interfaces";

import { format, parseISO } from "date-fns";

const currentDate: Date = new Date();
const formattedDate: string = format(currentDate, 'dd/MM/yyyy HH:mm');
console.log(formattedDate); // Output: 01/05/2024 06:10


export function formatReport(impactedResources: Array<ServiceHealthImpact>): HtmlNotification {


    const recipients = ""; //filteredTechLeads.map((lead) => lead?.email);

    // Prepare data
    const data = {
        itemCount: impactedResources.length,
        items: impactedResources,
        generatedOn: formattedDate
    }

    // Helpers
    Handlebars.registerHelper('formatDate', function (date: string) {
        const dateObj = parseISO(date);
        return format(dateObj, 'dd/MM/yyyy HH:mm');
    })

    Handlebars.registerHelper('portalLink', function (title: string, eventType: string) {

        const rawUrl = (eventType == "PlannedMaintenance") ? "https://portal.azure.com/#view/Microsoft_Azure_Health/AzureHealthBrowseBlade/~/plannedMaintenance" : "https://portal.azure.com/#view/Microsoft_Azure_Health/AzureHealthBrowseBlade/~/otherAnnouncements";
        const url = Handlebars.escapeExpression(rawUrl);
        const text = Handlebars.escapeExpression(title);
            
        return new Handlebars.SafeString("<a href='" + url + "'>" + text +"</a>");
    });

    // Load the template
    const template = Handlebars.compile(fs.readFileSync(path.resolve(__dirname, "../templates/report.hbs"), "utf8"));
    const bodyHtml = template(data);

    const notification: HtmlNotification = {
        bodyHtml: bodyHtml,
        bodyText: "Azure Service Health report generated on " + formattedDate
    }

    return notification;
};

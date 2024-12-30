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

    // Helper to format tags
    Handlebars.registerHelper('formatDate', function (date: string) {
        const dateObj = parseISO(date);
        return format(dateObj, 'dd/MM/yyyy HH:mm');
    })

    // Load the template
    const template = Handlebars.compile(fs.readFileSync(path.resolve(__dirname, "../templates/report.hbs"), "utf8"));
    const bodyHtml = template(data);

    const notification: HtmlNotification = {
        bodyHtml: bodyHtml,
        bodyText: "Azure Service Health report generated on " + formattedDate
    }

    return notification;
};

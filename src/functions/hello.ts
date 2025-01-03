import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";

export async function hello(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log(`Http function processed request for url "${request.url}"`);

    const secret = process.env.EMAIL_ENDPOINT;

    return { body: `Hello, ${secret}!` };
};

app.http('hello', {
    methods: ['GET', 'POST'],
    authLevel: 'anonymous',
    handler: hello
});

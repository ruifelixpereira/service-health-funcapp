import { SecretClient } from "@azure/keyvault-secrets";
import { DefaultAzureCredential } from "@azure/identity";

import { KeyVaultError, _getString } from "../common/apperror";


export class KeyVaultManager {

    private kvSecretClient: SecretClient;

    constructor() {
        const url = process.env["KEYVAULT_URI"] || "<keyvault-url>";
        const credential = new DefaultAzureCredential();
        this.kvSecretClient = new SecretClient(url, credential);
    }

    public async readSecret(secretName: string): Promise<string> {

        try {
            const secret = await this.kvSecretClient.getSecret(secretName);
            return secret.value;
        } catch (error) {
            const message = `Unable to get secret '${secretName}' from Key Vault with error: ${_getString(error)}`;
            throw new KeyVaultError(message);
        }

    }

}
#!/bin/bash

# The user/sp running this script needs to have at least the role of "Key Vault Secrets Officer" in the Key Vault

# load environment variables
set -a && source .env && set +a

# Required variables
required_vars=(
    "resourceGroupName"
    "commServiceName"
    "emailServiceName"
    "keyVaultName"
    "emailTestOnlyRecipient"
)

# Set the current directory to where the script lives.
cd "$(dirname "$0")"

# Function to check if all required arguments have been set
check_required_arguments() {
    # Array to store the names of the missing arguments
    local missing_arguments=()

    # Loop through the array of required argument names
    for arg_name in "${required_vars[@]}"; do
        # Check if the argument value is empty
        if [[ -z "${!arg_name}" ]]; then
            # Add the name of the missing argument to the array
            missing_arguments+=("${arg_name}")
        fi
    done

    # Check if any required argument is missing
    if [[ ${#missing_arguments[@]} -gt 0 ]]; then
        echo -e "\nError: Missing required arguments:"
        printf '  %s\n' "${missing_arguments[@]}"
        [ ! \( \( $# == 1 \) -a \( "$1" == "-c" \) \) ] && echo "  Either provide a .env file or all the arguments, but not both at the same time."
        [ ! \( $# == 22 \) ] && echo "  All arguments must be provided."
        echo ""
        exit 1
    fi
}

####################################################################################

# Check if all required arguments have been set
check_required_arguments

####################################################################################

# Load keys and values

# The endpoint of you Communications service.
EMAIL_ENDPOINT=$(az communication show --name $commServiceName --resource-group $resourceGroupName --query "hostName" -o tsv)
az keyvault secret set --vault-name $keyVaultName --name servicehealth-email-endpoint --value ${EMAIL_ENDPOINT}

# The email address of the sender for all emails.
FROM_SENDER_DOMAIN=$(az communication email domain show --resource-group $resourceGroupName --email-service-name $emailServiceName --name AzureManagedDomain --query "fromSenderDomain" -o tsv)
az keyvault secret set --vault-name $keyVaultName --name servicehealth-email-sender-address --value "donotreply@${FROM_SENDER_DOMAIN}"

# The email address for testing.
az keyvault secret set --vault-name $keyVaultName --name servicehealth-email-test-only-recipient --value ${emailTestOnlyRecipient}

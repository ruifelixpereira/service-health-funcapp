#!/bin/bash

# load environment variables
set -a && source .env && set +a

# Required variables
required_vars=(
    "resourceGroupName"
    "location"
    "storageAccountName"
    "keyVaultName"
    "emailServiceName"
    "funcAppName"
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

#
# Create/Get a resource group.
#
rg_query=$(az group list --query "[?name=='$resourceGroupName']")
if [ "$rg_query" == "[]" ]; then
   echo -e "\nCreating Resource group '$resourceGroupName'"
   az group create --name ${resourceGroupName} --location ${location}
else
   echo "Resource group $resourceGroupName already exists."
   #RG_ID=$(az group show --name $resource_group --query id -o tsv)
fi

#
# Create storage account
#
sa_query=$(az storage account list --query "[?name=='$storageAccountName']")
if [ "$sa_query" == "[]" ]; then
    echo -e "\nCreating Storage account '$storageAccountName'"
    az storage account create \
        --name $storageAccountName \
        --resource-group ${resourceGroupName} \
        --allow-blob-public-access false \
        --allow-shared-key-access true \
        --kind StorageV2 \
        --sku Standard_LRS
else
    echo "Storage account $storageAccountName already exists."
fi

#
# Create Key Vault
#
kv_query=$(az keyvault list --resource-group $resourceGroupName --query "[?name=='$keyVaultName']")
if [ "$kv_query" == "[]" ]; then
    echo -e "\nCreating Key Vault '$keyVaultName'"
    az keyvault create --location $location --name $keyVaultName --resource-group $resourceGroupName --enable-rbac-authorization true
else
    echo "Key Vault '$keyVaultName' already exists."
fi

#
# Create Azure Communication Services resource
#
cs_query=$(az communication list --resource-group $resourceGroupName --query "[?name=='$commServiceName']")
if [ "$cs_query" == "[]" ]; then
    echo -e "\nCreating Communication service '$commServiceName'"
    az communication create \
        --name $commServiceName \
        --location "Global" \
        --data-location "Europe" \
        --resource-group $resourceGroupName
else
    echo "Communication service '$commServiceName' already exists."
fi

#
# Create Email Communication Services resource
#
es_query=$(az communication email list --resource-group $resourceGroupName --query "[?name=='$emailServiceName']")
if [ "$es_query" == "[]" ]; then
    echo -e "\nCreating Email service '$emailServiceName'"
    az communication email create \
        --name $emailServiceName \
        --location "Global" \
        --data-location "Europe" \
        --resource-group $resourceGroupName
else
    echo "Email service '$emailServiceName' already exists."
fi

#
# Create Email Domain resource (free Azure managed domain)
#
ed_query=$(az communication email domain list --resource-group $resourceGroupName --email-service-name $emailServiceName --query "[?name=='AzureManagedDomain']")
if [ "$ed_query" == "[]" ]; then
    echo -e "\nCreating Email managed domain 'AzureManagedDomain'"
    az communication email domain create \
        --domain-name AzureManagedDomain \
        --email-service-name $emailServiceName \
        --location "Global" \
        --resource-group $resourceGroupName \
        --domain-management AzureManaged
else
    echo "Email managed domain already exists."
fi

#
# Link Email domain to Communications service
#
ld_query=$(az communication show --resource-group $resourceGroupName --name $commServiceName --query linkedDomains)
if [ "$ld_query" == "[]" ]; then
    echo -e "\Linking Email managed domain 'AzureManagedDomain' to Communications service"
    emailDomainResourceId=$(az communication email domain show --resource-group $resourceGroupName --email-service-name $emailServiceName --name AzureManagedDomain --query id -o tsv)
    az communication update \
        --name $commServiceName \
        --resource-group $resourceGroupName \
        --linked-domains $emailDomainResourceId
else
    echo "Email managed domain already linked."
fi

#
# Create Function App
#
fa_query=$(az functionapp list --resource-group $resourceGroupName --query "[?name=='$funcAppName']")
if [ "$fa_query" == "[]" ]; then
    echo -e "\nCreating Function app '$funcAppName'"
    az functionapp create \
        --consumption-plan-location $location \
        --name $funcAppName \
        --os-type Linux \
        --resource-group $resourceGroupName \
        --runtime node \
        --functions-version 4 \
        --runtime-version 20 \
        --storage-account $storageAccountName \
        --assign-identity
else
    echo "Function app '$funcAppName' already exists."
fi

#
# Add default application settings to Function App
#
az functionapp config appsettings set --name $funcAppName --resource-group $resourceGroupName --settings \
    EMAIL_SEND=true \
    EMAIL_ENDPOINT="@Microsoft.KeyVault(VaultName=$keyVaultName;SecretName=servicehealth-email-endpoint)" \
    EMAIL_SENDER_ADDRESS="@Microsoft.KeyVault(VaultName=$keyVaultName;SecretName=servicehealth-email-sender-address)" \
    EMAIL_TEST_ONLY_RECIPIENT="@Microsoft.KeyVault(VaultName=$keyVaultName;SecretName=servicehealth-email-test-only-recipient)"

#
# Add permissions to the Function App assigned identity
#
FUNCAPP_ID=$(az functionapp identity show --name $funcAppName --resource-group $resourceGroupName --query principalId -o tsv)

# Assign Storage Blob and Queue roles to Function App assigned identity on Storage Account
STORAGE_ACCOUNT_ID=$(az storage account show --name $storageAccountName --resource-group $resourceGroupName --query id -o tsv)
az role assignment create --assignee $FUNCAPP_ID --role "Storage Blob Data Owner" --scope $STORAGE_ACCOUNT_ID
az role assignment create --assignee $FUNCAPP_ID --role "Storage Queue Data Contributor" --scope $STORAGE_ACCOUNT_ID

# Assign Key Vault Secrets User role to Function App assigned identity on Key Vault
KEYVAULT_ID=$(az keyvault show --name $keyVaultName --resource-group $resourceGroupName --query id -o tsv)
#az role assignment create --assignee $FUNCAPP_ID --role "Key Vault Secrets Officer" --scope $KEYVAULT_ID
az role assignment create --assignee $FUNCAPP_ID --role "Key Vault Secrets User" --scope $KEYVAULT_ID

# Assign Contributor role to Function App assigned identity on Communication service
COMMSERVICE_ID=$(az communication show --name $commServiceName --resource-group $resourceGroupName --query id -o tsv)
az role assignment create --assignee $FUNCAPP_ID --role "Contributor" --scope $COMMSERVICE_ID

#
# Create a Storage Queues
#
az storage queue create --name "notifications" --account-name $storageAccountName
az storage queue create --name "retry-email" --account-name $storageAccountName
az storage queue create --name "failed-email" --account-name $storageAccountName

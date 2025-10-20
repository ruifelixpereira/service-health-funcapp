// Service Principal Setup for Local Development
// This Bicep template creates role assignments for a service principal
// The service principal itself must be created via Azure CLI/PowerShell

@description('The prefix for resource names')
param prefix string = 'smcp'

@description('The name of the storage account')
param storageAccountName string = '${prefix}snapmngsa01'

@description('Name of the Key Vault')
param keyVaultName string = '${prefix}svchealth-kv01'

@description('Whether to create Communication Services resources')
param createCommunicationServices bool = false

@description('Name of the Communication Service')
param commServiceName string = '${prefix}svchealth-cs01'

@description('Email address for test emails')
param emailTestOnlyRecipient string = 'xpto@contoso.com'

@description('The object ID (principal ID) of the service principal')
param servicePrincipalObjectId string

@description('The application (client) ID of the service principal')
param servicePrincipalClientId string

@description('The display name for the service principal')
param servicePrincipalDisplayName string = 'local-dev-service-principal'

// Reference existing resources
resource existingStorageAccount 'Microsoft.Storage/storageAccounts@2023-05-01' existing = {
  name: storageAccountName
}

resource existingKeyVault 'Microsoft.KeyVault/vaults@2023-07-01' existing = {
  name: keyVaultName
}

resource existingCommunicationService 'Microsoft.Communication/communicationServices@2023-04-01' existing = if (createCommunicationServices) {
  name: commServiceName
}


// Storage Account Role Assignments
resource storageAccountBlobDataOwnerRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(servicePrincipalObjectId, existingStorageAccount.id, 'Storage Blob Data Owner')
  scope: existingStorageAccount
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', 'b7e6dc6d-f1e8-4753-8033-0f276bb0955b') // Storage Blob Data Owner
    principalId: servicePrincipalObjectId
    principalType: 'ServicePrincipal'
    description: 'Allows service principal to manage storage blobs for local development'
  }
}

resource storageAccountQueueDataContributorRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(servicePrincipalObjectId, existingStorageAccount.id, 'Storage Queue Data Contributor')
  scope: existingStorageAccount
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '974c5e8b-45b9-4653-ba55-5f855dd0fb88') // Storage Queue Data Contributor
    principalId: servicePrincipalObjectId
    principalType: 'ServicePrincipal'
    description: 'Allows service principal to manage storage queues for local development'
  }
}

resource storageAccountTableDataContributorRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(servicePrincipalObjectId, existingStorageAccount.id, 'Storage Table Data Contributor')
  scope: existingStorageAccount
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '0a9a7e1f-b9d0-4cc4-a60d-0319b160aaa3') // Storage Table Data Contributor
    principalId: servicePrincipalObjectId
    principalType: 'ServicePrincipal'
    description: 'Allows service principal to manage storage tables for local development'
  }
}

// Key Vault Role Assignments
resource keyvaultRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(servicePrincipalObjectId, existingKeyVault.id, 'Key Vault Secrets Officer')
  scope: existingKeyVault
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', 'b86a8fe4-44ce-4948-aee5-eccb2c155cd7') // Key Vault Secrets Officer
    principalId: servicePrincipalObjectId
    principalType: 'ServicePrincipal'
  }
}

// Communication service Role Assignments
resource commServiceRoleContributorAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = if (createCommunicationServices) {
  name: guid(servicePrincipalObjectId, existingCommunicationService.id, 'Contributor')
  scope: existingCommunicationService
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', 'b24988ac-6180-42a0-ab88-20f7382dd24c') // Contributor
    principalId: servicePrincipalObjectId
    principalType: 'ServicePrincipal'
  }
}


// Outputs
output servicePrincipalClientId string = servicePrincipalClientId
output servicePrincipalObjectId string = servicePrincipalObjectId
output servicePrincipalDisplayName string = servicePrincipalDisplayName

// Generate local.settings.json structure
output localSettingsJson object = {
  IsEncrypted: false
  Values: union({
    FUNCTIONS_WORKER_RUNTIME: 'node'
    AzureWebJobsStorage__accountname: existingStorageAccount.name
    AZURE_TENANT_ID: subscription().tenantId
    AZURE_CLIENT_ID: servicePrincipalClientId
  }, createCommunicationServices ? {
    EMAIL_SEND: 'true'
    EMAIL_ENDPOINT: '@Microsoft.KeyVault(VaultName=${existingKeyVault.name};SecretName=servicehealth-email-endpoint)'
    EMAIL_SENDER_ADDRESS: '@Microsoft.KeyVault(VaultName=${existingKeyVault.name};SecretName=servicehealth-email-sender-address)'
    EMAIL_TEST_ONLY_RECIPIENT: '@Microsoft.KeyVault(VaultName=${existingKeyVault.name};SecretName=servicehealth-email-test-only-recipient)'
  } : {
    EMAIL_SEND: 'false'
    EMAIL_ENDPOINT: ''
    EMAIL_SENDER_ADDRESS: ''
    EMAIL_TEST_ONLY_RECIPIENT: emailTestOnlyRecipient
  })
}

// Summary of permissions granted
output permissionsSummary array = [
  'Storage Blob Data Owner on ${existingStorageAccount.name}'
  'Storage Queue Data Contributor on ${existingStorageAccount.name}'
  'Storage Table Data Contributor on ${existingStorageAccount.name}'
  'Key Vault Secrets Officer on ${existingKeyVault.name}'
  'Contributor on ${existingCommunicationService.name} (if Communication Services created)'
]

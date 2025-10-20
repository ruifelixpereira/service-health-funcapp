// Creates: Storage Account (with queues), App Service Plan, Function App (system assigned identity),
// Log Analytics Workspace, Data Collection Endpoint (DCE) and Data Collection Rule (DCR).
// Role assignments (Storage Blob Data Owner, Storage Queue Data Contributor, Monitoring Metrics Publisher, Contributor).
// Azure Monitor Workbook (from JSON file).

// Parameters
param prefix string = 'sh' // prefix for resource names

@description('Name of the storage account')
param storageAccountName string = '${prefix}svchealthsa01'

@description('Name of the Function App')
param funcAppName string = '${prefix}svchealth-fa01'

@description('Azure region for resources')
param location string = resourceGroup().location

@description('Name of the Log Analytics Workspace') 
param workspaceName string = '${prefix}svchealth-law01'

@description('Name of the Application Insights') 
param appInsightsName string = '${prefix}svchealth-ai01'

@description('Name of the Key Vault')
param keyVaultName string = '${prefix}svchealth-kv01'

@description('Whether to create Communication Services resources')
param createCommunicationServices bool = false

@description('Name of the Email Communication Service')
param emailServiceName string = '${prefix}svchealth-ecs01'

@description('Name of the Communication Service')
param commServiceName string = '${prefix}svchealth-cs01'

@description('Email address for test emails')
param emailTestOnlyRecipient string = 'xpto@contoso.com'


// Variables
var saName string = toLower(storageAccountName)

var deploymentStorageContainerName = 'deployment'

var queuesToCreate = [
  'notifications'
  'retry-email'
  'failed-email'
]

// Storage Account
resource storageAccount 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: saName
  location: location
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    accessTier: 'Hot'
    allowBlobPublicAccess: false
    allowSharedKeyAccess: false
    minimumTlsVersion: 'TLS1_2'
    supportsHttpsTrafficOnly: true
    networkAcls: {
      bypass: 'AzureServices'
      defaultAction: 'Allow'
    }
    publicNetworkAccess: 'Enabled'
  }

  resource blobServices 'blobServices' = {
    name: 'default'
    properties: {
      deleteRetentionPolicy: {}
    }

    resource deploymentContainer 'containers' = {
      name: deploymentStorageContainerName
      properties: {
        publicAccess: 'None'
      }
    }
  }

  //resource queueservices 'queueServices' = {
  //  name: 'default'
  //  properties: {}
  //}

}


// Create the default queue service (required parent)
resource storageQueueService 'Microsoft.Storage/storageAccounts/queueServices@2021-09-01' = {
  name: 'default'
  parent: storageAccount
  properties: {}
}

// Create queues
resource queues 'Microsoft.Storage/storageAccounts/queueServices/queues@2021-09-01' = [for q in queuesToCreate: {
  name: q
  parent: storageQueueService
  properties: {}
}]

// App Service plan (Flex Consumption)
resource hostingPlan 'Microsoft.Web/serverfarms@2024-11-01' = {
  name: '${funcAppName}-plan'
  location: location
  kind: 'functionapp'
  sku: {
    name: 'FC1'
    tier: 'FlexConsumption'
  }
  properties: {
    reserved: true // Enables Linux
  }
}

// Function App
resource functionApp 'Microsoft.Web/sites@2024-11-01' = {
  name: funcAppName
  location: location
  kind: 'functionapp,linux'
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    serverFarmId: hostingPlan.id
    httpsOnly: true
    functionAppConfig:{
      runtime:{
        name: 'node'
        version: '20'
      }
      deployment: {
        storage: {
          type: 'blobContainer'
          value: '${storageAccount.properties.primaryEndpoints.blob}${deploymentStorageContainerName}'
          authentication: {
            type: 'SystemAssignedIdentity'
          }
        }
      }
      scaleAndConcurrency: {
        maximumInstanceCount: 100
        instanceMemoryMB: 2048
      }
    }
    siteConfig: {
      appSettings: [
        {
          name: 'AzureWebJobsStorage__accountname'
          value: storageAccount.name
        }
      ]
    }
  }

}

// Role Assignments for storage
// Check https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles/storage
resource blobRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(functionApp.name, storageAccount.id, 'Storage Blob Data Owner')
  scope: storageAccount
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', 'b7e6dc6d-f1e8-4753-8033-0f276bb0955b') // Storage Blob Data Owner
    principalId: functionApp.identity.principalId
    principalType: 'ServicePrincipal'
  }
}

resource queueRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(functionApp.name, storageAccount.id, 'Storage Queue Data Contributor')
  scope: storageAccount
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '974c5e8b-45b9-4653-ba55-5f855dd0fb88') // Storage Queue Data Contributor

    principalId: functionApp.identity.principalId
    principalType: 'ServicePrincipal'
  }
}

resource tableRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(functionApp.name, storageAccount.id, 'Storage Table Data Contributor')
  scope: storageAccount
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '0a9a7e1f-b9d0-4cc4-a60d-0319b160aaa3') // Storage Table Data Contributor

    principalId: functionApp.identity.principalId
    principalType: 'ServicePrincipal'
  }
}

// Log Analytics Workspace
resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2021-06-01' = {
  name: workspaceName
  location: location
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: 30
  }
}

// Application Insights for Function App monitoring
resource applicationInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: appInsightsName
  location: location
  kind: 'web'
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: logAnalytics.id
    IngestionMode: 'LogAnalytics'
    RetentionInDays: 30
    publicNetworkAccessForIngestion: 'Enabled'
    publicNetworkAccessForQuery: 'Enabled'
  }
}


// Key Vault
resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: keyVaultName
  location: location
  properties: {
    sku: {
      family: 'A'
      name: 'standard'
    }
    tenantId: tenant().tenantId
    enableRbacAuthorization: true
    enableSoftDelete: true
    enablePurgeProtection: true
  }
}

resource keyvaultRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(functionApp.name, keyVault.id, 'Key Vault Secrets Officer')
  scope: keyVault
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', 'b86a8fe4-44ce-4948-aee5-eccb2c155cd7') // Key Vault Secrets Officer
    principalId: functionApp.identity.principalId
    principalType: 'ServicePrincipal'
  }
}


// Communication Service - conditional creation
resource communicationService 'Microsoft.Communication/communicationServices@2023-04-01' = if (createCommunicationServices) {
  name: commServiceName
  location: 'global'
  properties: {
    dataLocation: 'Europe'
    linkedDomains: [emailDomain.id]
  }
}


// Email Communication Service - conditional creation
resource emailService 'Microsoft.Communication/emailServices@2023-04-01' = if (createCommunicationServices) {
  name: emailServiceName
  location: 'global'
  properties: {
    dataLocation: 'Europe'
  }
}


// Email Domain (Azure Managed) - conditional creation
resource emailDomain 'Microsoft.Communication/emailServices/domains@2023-04-01' = if (createCommunicationServices) {
  name: 'AzureManagedDomain'
  parent: emailService
  location: 'global'
  properties: {
    domainManagement: 'AzureManaged'
  }
}


// Add keys to Key Vault for email service - conditional creation
resource emailEndpointSecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = if (createCommunicationServices) {
  name: 'servicehealth-email-endpoint'
  parent: keyVault
  properties: {
    value: 'https://${communicationService.?properties.hostName}'
  }
}

resource emailSenderAddressSecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = if (createCommunicationServices) {
  name: 'servicehealth-email-sender-address'
  parent: keyVault
  properties: {
    value: 'donotreply@${emailDomain.?properties.fromSenderDomain}'
  }
}

resource emailTestOnlyRecipientSecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  name: 'servicehealth-email-test-only-recipient'
  parent: keyVault
  properties: {
    value: emailTestOnlyRecipient
  } 
} 


// Function App settings
resource appSettings 'Microsoft.Web/sites/config@2022-03-01' = {
  parent: functionApp
  name: 'appsettings'
  properties: union({
    AzureWebJobsStorage__accountname: storageAccount.name
    APPLICATIONINSIGHTS_CONNECTION_STRING: applicationInsights.properties.ConnectionString
    APPINSIGHTS_INSTRUMENTATIONKEY: applicationInsights.properties.InstrumentationKey
  }, createCommunicationServices ? {
    EMAIL_SEND: 'true'
    EMAIL_ENDPOINT: '@Microsoft.KeyVault(VaultName=${keyVaultName};SecretName=servicehealth-email-endpoint)'
    EMAIL_SENDER_ADDRESS: '@Microsoft.KeyVault(VaultName=${keyVaultName};SecretName=servicehealth-email-sender-address)'
    EMAIL_TEST_ONLY_RECIPIENT: '@Microsoft.KeyVault(VaultName=${keyVaultName};SecretName=servicehealth-email-test-only-recipient)'
  } : {
    EMAIL_SEND: 'false'
    EMAIL_ENDPOINT: ''
    EMAIL_SENDER_ADDRESS: ''
    EMAIL_TEST_ONLY_RECIPIENT: emailTestOnlyRecipient
  })
}


// Add this resource for the custom role definition
resource acsEmailWriteRole 'Microsoft.Authorization/roleDefinitions@2022-04-01' = if (createCommunicationServices) {
  name: guid(subscription().id, 'ACS Email Write')
  properties: {
    roleName: 'ACS Email Write'
    description: 'Send emails using the communications service.'
    type: 'CustomRole'
    permissions: [
      {
        actions: [
          'Microsoft.Communication/CommunicationServices/Read'
          'Microsoft.Communication/CommunicationServices/Write'
          'Microsoft.Communication/EmailServices/write'
        ]
        notActions: []
        dataActions: []
        notDataActions: []
      }
    ]
    assignableScopes: [
      resourceGroup().id
    ]
  }
}

// Assign Contributor role to Function App assigned identity on Communication service
resource commServiceRoleContributorAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = if (createCommunicationServices) {
  name: guid(functionApp.name, communicationService.id, 'Contributor')
  scope: communicationService
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', 'b24988ac-6180-42a0-ab88-20f7382dd24c') // Contributor
    principalId: functionApp.identity.principalId
    principalType: 'ServicePrincipal'
  }
}

resource commServiceRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = if (createCommunicationServices) {
  name: guid(functionApp.name, communicationService.id, 'ACS Email Write')
  scope: communicationService
  properties: {
    roleDefinitionId: acsEmailWriteRole.id
    principalId: functionApp.identity.principalId
    principalType: 'ServicePrincipal'
  }
}

// Outputs
output storageAccountId string = storageAccount.id
output functionAppIdentityPrincipalId string = functionApp.identity.principalId
output functionAppName string = functionApp.name
output logAnalyticsWorkspaceName string = logAnalytics.name
output applicationInsightsName string = applicationInsights.name
output applicationInsightsInstrumentationKey string = applicationInsights.properties.InstrumentationKey
output applicationInsightsConnectionString string = applicationInsights.properties.ConnectionString

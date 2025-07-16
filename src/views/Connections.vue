<template>
  <div class="h-full overflow-auto">
    <div class="max-w-4xl mx-auto p-6">
      <!-- Page Header -->
      <div class="mb-8">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-3xl font-bold text-foreground">Connection Settings</h1>
            <p class="text-muted-foreground mt-2">
              Configure your NATS server connections and manage connection settings.
            </p>
          </div>
          <button
            @click="router.push({ name: 'dashboard' })"
            class="px-4 py-2 text-sm bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-md transition-colors"
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>

      <!-- Current Connection Status -->
      <div class="mb-8 p-6 bg-card border border-border rounded-lg">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-xl font-semibold text-foreground">Current Connection</h2>
          <div class="flex items-center gap-2">
            <div 
              :class="[
                'w-3 h-3 rounded-full',
                connectionStatus === 'connected' ? 'bg-green-500' :
                connectionStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' :
                connectionStatus === 'error' ? 'bg-red-500' : 'bg-gray-400'
              ]"
            />
            <span class="text-sm font-medium capitalize">{{ connectionStatusText }}</span>
          </div>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div v-if="currentConfig">
            <span class="text-muted-foreground">Server:</span>
            <span class="ml-2 font-mono">{{ currentConfig.servers?.[0] || 'N/A' }}</span>
          </div>
          <div v-if="currentConfig">
            <span class="text-muted-foreground">Authentication:</span>
            <span class="ml-2 capitalize">{{ currentConfig.authType || 'None' }}</span>
          </div>
          <div v-if="connectionStats && isConnected">
            <span class="text-muted-foreground">Messages:</span>
            <span class="ml-2">{{ connectionStats.totalMessages || 0 }}</span>
          </div>
          <div v-if="connectionStats && isConnected">
            <span class="text-muted-foreground">Subscriptions:</span>
            <span class="ml-2">{{ connectionStats.subscriptionsCount || 0 }}</span>
          </div>
        </div>
        
        <div v-if="connectionError" class="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
          <div class="text-sm text-red-800 dark:text-red-200">
            <strong>Error:</strong> {{ connectionError.message }}
          </div>
        </div>
        
        <div class="mt-4 flex gap-3">
          <button
            v-if="canDisconnect"
            @click="handleDisconnect"
            :disabled="operationInProgress"
            class="px-4 py-2 bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50 rounded-md transition-colors disabled:opacity-50"
          >
            Disconnect
          </button>
          <button
            v-if="canConnect && currentConfig"
            @click="handleReconnect"
            :disabled="operationInProgress"
            class="px-4 py-2 bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50 rounded-md transition-colors disabled:opacity-50"
          >
            Reconnect
          </button>
        </div>
      </div>

      <!-- Connection Configuration -->
      <div class="mb-8">
        <div class="bg-card border border-border rounded-lg">
          <div class="p-4 border-b border-border">
            <h2 class="text-xl font-semibold text-foreground">Connection Configuration</h2>
            <p class="text-muted-foreground text-sm mt-1">
              Configure a new connection or modify the current connection settings.
            </p>
          </div>
          
          <div class="p-6">
            <ConnectionConfig
              :initial-config="editingConfig"
              @connected="handleConnected"
              @test-result="handleTestResult"
            />
          </div>
        </div>
      </div>

      <!-- Saved Connections -->
      <div v-if="savedConfigs.length > 0" class="mb-8">
        <div class="bg-card border border-border rounded-lg">
          <div class="p-4 border-b border-border">
            <h2 class="text-xl font-semibold text-foreground">Saved Connections</h2>
            <p class="text-muted-foreground text-sm mt-1">
              Quick access to your previously configured connections.
            </p>
          </div>
          
          <div class="p-6">
            <div class="space-y-3">
              <div
                v-for="config in savedConfigs"
                :key="config.id"
                class="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-accent/50 transition-colors"
              >
                <div class="flex-1">
                  <div class="flex items-center gap-3">
                    <h3 class="font-medium text-foreground">{{ config.name }}</h3>
                    <span v-if="isCurrentConnection(config)" class="text-xs px-2 py-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded">
                      Current
                    </span>
                  </div>
                  <div class="text-sm text-muted-foreground mt-1">
                    {{ config.servers?.[0] }} • {{ config.authType === 'userpass' ? 'Username/Password' : config.authType === 'creds' ? 'Credentials File' : 'No Auth' }}
                  </div>
                  <div class="text-xs text-muted-foreground mt-1">
                    Saved {{ formatDate(config.createdAt) }}
                  </div>
                </div>
                
                <div class="flex items-center gap-2">
                  <button
                    @click="loadConnection(config)"
                    class="px-3 py-1 text-sm bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded transition-colors"
                    title="Load this configuration into the form"
                  >
                    Edit
                  </button>
                  <button
                    @click="quickConnect(config)"
                    :disabled="operationInProgress || isCurrentConnection(config)"
                    :class="[
                      'px-3 py-1 text-sm rounded transition-colors disabled:opacity-50',
                      isCurrentConnection(config) 
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 cursor-not-allowed'
                        : 'bg-primary text-primary-foreground hover:bg-primary/90'
                    ]"
                    :title="isCurrentConnection(config) ? 'Currently connected' : 'Quick connect'"
                  >
                    {{ isCurrentConnection(config) ? 'Current' : (config.authType === 'userpass' ? 'Connect...' : 'Connect') }}
                  </button>
                  <button
                    @click="deleteConnection(config.id)"
                    class="p-1 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                    title="Delete connection"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Connection Help -->
      <div class="bg-card border border-border rounded-lg">
        <div class="p-4 border-b border-border">
          <h2 class="text-xl font-semibold text-foreground">Connection Help</h2>
        </div>
        
        <div class="p-6">
          <div class="space-y-4 text-sm">
            <div>
              <h3 class="font-medium text-foreground mb-2">Server URLs</h3>
              <p class="text-muted-foreground">
                Use WebSocket URLs for NATS connections. Examples:
              </p>
              <ul class="mt-2 space-y-1 text-muted-foreground font-mono text-xs">
                <li>• ws://localhost:8080 (local development)</li>
                <li>• wss://nats.example.com:443 (secure production)</li>
                <li>• ws://demo.nats.io:8080 (public demo server)</li>
              </ul>
            </div>
            
            <div>
              <h3 class="font-medium text-foreground mb-2">Authentication</h3>
              <ul class="space-y-1 text-muted-foreground">
                <li>• <strong>None:</strong> No authentication required</li>
                <li>• <strong>Username & Password:</strong> Basic authentication</li>
                <li>• <strong>Credentials File:</strong> JWT-based authentication with .creds file</li>
              </ul>
            </div>
            
            <div>
              <h3 class="font-medium text-foreground mb-2">Troubleshooting</h3>
              <ul class="space-y-1 text-muted-foreground">
                <li>• Ensure NATS server supports WebSocket connections</li>
                <li>• Check firewall and network connectivity</li>
                <li>• Verify authentication credentials are correct</li>
                <li>• Use secure (wss://) connections in production</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Password Prompt Modal -->
    <div
      v-if="showPasswordPrompt"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      @click.self="cancelPasswordPrompt"
    >
      <div class="bg-background border border-border rounded-lg p-6 max-w-md w-full mx-4 shadow-lg">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold">Enter Password</h3>
          <button
            @click="cancelPasswordPrompt"
            class="p-1 hover:bg-accent rounded"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div class="space-y-4">
          <div class="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md">
            <div class="text-sm text-blue-800 dark:text-blue-200">
              <strong>Security Note:</strong> For security reasons, passwords are not stored. Please enter your password to connect.
            </div>
          </div>
          
          <div>
            <div class="text-sm text-muted-foreground mb-2">
              Connection: <span class="font-medium">{{ passwordPrompt.config?.name }}</span>
            </div>
            <div class="text-sm text-muted-foreground mb-2">
              Username: <span class="font-medium">{{ passwordPrompt.config?.username }}</span>
            </div>
          </div>
          
          <div>
            <label for="promptPassword" class="block text-sm font-medium text-foreground mb-2">
              Password
            </label>
            <input
              id="promptPassword"
              ref="passwordInput"
              v-model="passwordPrompt.password"
              type="password"
              placeholder="Enter your password"
              @keyup.enter="connectWithPassword"
              @keyup.escape="cancelPasswordPrompt"
              class="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            <div class="text-xs text-muted-foreground mt-1">
              Press Enter to connect, Escape to cancel
            </div>
          </div>
          
          <div class="flex gap-3 pt-4">
            <button
              @click="cancelPasswordPrompt"
              class="flex-1 px-4 py-2 text-sm border border-input rounded-md hover:bg-accent transition-colors"
            >
              Cancel
            </button>
            <button
              @click="connectWithPassword"
              :disabled="!passwordPrompt.password || passwordPrompt.isConnecting"
              class="flex-1 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              <span v-if="!passwordPrompt.isConnecting">Connect</span>
              <span v-else class="flex items-center justify-center gap-2">
                <svg class="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Connecting...
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { useNatsConnection } from '@/composables/useNatsConnection.js';
import { useToast } from '@/composables/useToast.js';
import ConnectionConfig from '@/components/connection/ConnectionConfig.vue';

// Composables
const router = useRouter();
const {
  isConnected,
  isConnecting,
  connectionStatus,
  connectionStatusText,
  connectionError,
  connectionStats,
  currentConfig,
  savedConfigs,
  canConnect,
  canDisconnect,
  operationInProgress,
  connect,
  disconnect,
  reconnect,
  removeSavedConfig,
  createDefaultConfig
} = useNatsConnection();

const { success, error, info, warning } = useToast();

// Local state
const editingConfig = ref(null);
const passwordInput = ref(null);
const showPasswordPrompt = ref(false);
const passwordPrompt = ref({
  config: null,
  password: '',
  isConnecting: false
});

// Computed properties

// Methods
async function handleDisconnect() {
  try {
    await disconnect();
    success('Disconnected from NATS server');
  } catch (err) {
    error(`Disconnect error: ${err.message}`);
  }
}

async function handleReconnect() {
  try {
    await reconnect();
    success('Reconnected to NATS server');
  } catch (err) {
    error(`Reconnect error: ${err.message}`);
  }
}

function handleConnected(config) {
  success(`Connected to ${config.servers[0]}`);
  
  // Navigate to dashboard after successful connection
  setTimeout(() => {
    router.push({ name: 'dashboard' });
  }, 1500);
}

function handleTestResult(result) {
  if (result.success) {
    success('Connection test successful');
  } else {
    error(`Connection test failed: ${result.error || 'Unknown error'}`);
  }
}

function loadConnection(config) {
  // Restore the full config (excluding sensitive data for security)
  editingConfig.value = {
    ...config,
    // Note: We don't restore sensitive data here for security
    // User will need to re-enter passwords/credentials
    password: '',
    credsContent: ''
  };
  
  info(`Loaded connection: ${config.name}`);
}

async function quickConnect(config) {
  if (isCurrentConnection(config)) {
    return;
  }

  // For username/password auth, we need to prompt for password
  if (config.authType === 'userpass') {
    showPasswordPrompt.value = true;
    passwordPrompt.value.config = config;
    passwordPrompt.value.password = '';
    
    // Focus the password input after the modal opens
    await nextTick();
    passwordInput.value?.focus();
    return;
  }
  
  // For creds auth, we need the user to load and enter credentials
  if (config.authType === 'creds') {
    warning('Please edit the connection and enter your credentials file content');
    loadConnection(config);
    return;
  }

  // For no auth, connect directly
  try {
    await connect(config);
    success(`Connected to ${config.name}`);
  } catch (err) {
    error(`Quick connect failed: ${err.message}`);
  }
}

async function connectWithPassword() {
  if (!passwordPrompt.value.config || !passwordPrompt.value.password) {
    return;
  }

  try {
    passwordPrompt.value.isConnecting = true;
    
    const connectConfig = {
      ...passwordPrompt.value.config,
      password: passwordPrompt.value.password
    };
    
    await connect(connectConfig);
    success(`Connected to ${passwordPrompt.value.config.name}`);
    
    // Close prompt
    showPasswordPrompt.value = false;
    passwordPrompt.value = { config: null, password: '', isConnecting: false };
  } catch (err) {
    error(`Connection failed: ${err.message}`);
  } finally {
    passwordPrompt.value.isConnecting = false;
  }
}

function cancelPasswordPrompt() {
  showPasswordPrompt.value = false;
  passwordPrompt.value = { config: null, password: '', isConnecting: false };
}

function deleteConnection(configId) {
  if (confirm('Are you sure you want to delete this saved connection?')) {
    removeSavedConfig(configId);
    info('Connection deleted');
  }
}

function isCurrentConnection(config) {
  if (!currentConfig.value) return false;
  
  return (
    config.name === currentConfig.value.name &&
    config.servers?.[0] === currentConfig.value.servers?.[0] &&
    config.authType === currentConfig.value.authType
  );
}

function formatDate(timestamp) {
  if (!timestamp) return 'Unknown';
  
  const date = new Date(timestamp);
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
}

// Lifecycle
onMounted(() => {
  // Initialize with current config or default
  if (currentConfig.value) {
    editingConfig.value = {
      ...currentConfig.value,
      // Clear sensitive data
      password: '',
      credsContent: ''
    };
  } else {
    editingConfig.value = createDefaultConfig();
  }
});
</script>

<style scoped>
/* Custom styles for connection status indicators */
.animate-pulse {
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}
</style>

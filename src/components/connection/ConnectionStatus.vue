<template>
  <div class="flex items-center gap-2">
    <!-- Connection Indicator -->
    <div
      :class="[
        'w-3 h-3 rounded-full transition-all duration-300',
        statusClasses.indicator,
        isConnecting && 'animate-pulse'
      ]"
      :title="statusTooltip"
    />
    
    <!-- Status Text (hidden on small screens) -->
    <span
      :class="[
        'text-sm font-medium transition-colors duration-300',
        'hidden sm:inline-block',
        statusClasses.text
      ]"
    >
      {{ connectionStatusText }}
    </span>
    
    <!-- Connection Actions -->
    <div class="flex items-center gap-1 ml-2">
      <!-- Connect/Disconnect Button -->
      <button
        v-if="canConnect || canDisconnect"
        @click="handleConnectionToggle"
        :disabled="operationInProgress"
        :class="[
          'px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200',
          'focus:outline-none focus:ring-2 focus:ring-offset-2',
          canConnect 
            ? 'bg-green-100 text-green-700 hover:bg-green-200 focus:ring-green-500 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50'
            : 'bg-red-100 text-red-700 hover:bg-red-200 focus:ring-red-500 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50',
          operationInProgress && 'opacity-50 cursor-not-allowed'
        ]"
        :title="canConnect ? 'Connect to NATS' : 'Disconnect from NATS'"
      >
        <span v-if="!operationInProgress">
          {{ canConnect ? 'Connect' : 'Disconnect' }}
        </span>
        <span v-else class="flex items-center gap-1">
          <svg class="w-3 h-3 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          {{ isConnecting ? 'Connecting...' : 'Disconnecting...' }}
        </span>
      </button>
      
      <!-- Settings Button -->
      <button
        @click="openConnectionSettings"
        class="p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors"
        title="Connection Settings"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>
    </div>
  </div>
  
  <!-- Connection Details Popover (optional - could be expanded later) -->
  <div
    v-if="showDetails"
    class="absolute top-full right-0 mt-2 w-80 p-4 bg-popover border border-border rounded-lg shadow-lg z-50"
  >
    <div class="space-y-3">
      <div class="flex items-center justify-between">
        <h3 class="text-sm font-semibold">Connection Details</h3>
        <button
          @click="showDetails = false"
          class="p-1 hover:bg-accent rounded text-muted-foreground hover:text-foreground"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      <div class="text-sm space-y-2" v-if="connectionInfo">
        <div class="flex justify-between">
          <span class="text-muted-foreground">Status:</span>
          <span :class="statusClasses.text">{{ connectionInfo.statusText }}</span>
        </div>
        
        <div v-if="connectionInfo.config" class="flex justify-between">
          <span class="text-muted-foreground">Server:</span>
          <span class="font-mono text-xs">{{ connectionInfo.config.servers?.[0] || 'N/A' }}</span>
        </div>
        
        <div v-if="connectionStats" class="flex justify-between">
          <span class="text-muted-foreground">Messages:</span>
          <span>{{ connectionStats.totalMessages || 0 }}</span>
        </div>
        
        <div v-if="connectionStats" class="flex justify-between">
          <span class="text-muted-foreground">Subscriptions:</span>
          <span>{{ connectionStats.subscriptionsCount || 0 }}</span>
        </div>
        
        <div v-if="connectionError" class="mt-3 p-2 bg-red-50 dark:bg-red-900/20 rounded text-xs">
          <div class="text-red-600 dark:text-red-400 font-medium">Error:</div>
          <div class="text-red-700 dark:text-red-300">{{ connectionError.message }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useNatsConnection } from '@/composables/useNatsConnection.js';

// Composables
const router = useRouter();
const {
  isConnected,
  isConnecting,
  connectionError,
  connectionStatus,
  connectionStatusText,
  connectionStats,
  canConnect,
  canDisconnect,
  operationInProgress,
  connect,
  disconnect,
  getConnectionInfo,
  createDefaultConfig
} = useNatsConnection();

// Local state
const showDetails = ref(false);
const connectionInfo = ref(null);

// Computed properties
const statusClasses = computed(() => {
  switch (connectionStatus.value) {
    case 'connected':
      return {
        indicator: 'bg-green-500 shadow-green-500/30 shadow-md',
        text: 'text-green-700 dark:text-green-400'
      };
    case 'connecting':
      return {
        indicator: 'bg-yellow-500 shadow-yellow-500/30 shadow-md',
        text: 'text-yellow-700 dark:text-yellow-400'
      };
    case 'error':
      return {
        indicator: 'bg-red-500 shadow-red-500/30 shadow-md',
        text: 'text-red-700 dark:text-red-400'
      };
    default:
      return {
        indicator: 'bg-gray-400 dark:bg-gray-600',
        text: 'text-gray-700 dark:text-gray-300'
      };
  }
});

const statusTooltip = computed(() => {
  const status = connectionStatusText.value;
  if (connectionError.value) {
    return `${status}: ${connectionError.value.message}`;
  }
  return status;
});

// Methods
async function handleConnectionToggle() {
  try {
    if (canConnect.value) {
      // If no saved config exists, redirect to settings
      const config = createDefaultConfig();
      if (!config || !config.servers?.length) {
        openConnectionSettings();
        return;
      }
      
      await connect(config);
      showToast('Connected to NATS server', 'success');
    } else if (canDisconnect.value) {
      await disconnect();
      showToast('Disconnected from NATS server', 'info');
    }
  } catch (error) {
    showToast(`Connection error: ${error.message}`, 'error');
  }
}

function openConnectionSettings() {
  router.push({ name: 'connections' });
}

function updateConnectionInfo() {
  connectionInfo.value = getConnectionInfo();
}

function showToast(message, type = 'info') {
  // Simple toast implementation - would be replaced with proper toast service
  console.log(`[Toast ${type}]: ${message}`);
  
  // TODO: Implement proper toast notifications
  // For now, just create a simple alert
  if (type === 'error') {
    console.error(message);
  }
}

function handleClickOutside(event) {
  if (showDetails.value && !event.target.closest('.connection-status-container')) {
    showDetails.value = false;
  }
}

// Lifecycle
onMounted(() => {
  updateConnectionInfo();
  document.addEventListener('click', handleClickOutside);
  
  // Update connection info periodically
  const interval = setInterval(updateConnectionInfo, 5000);
  
  onUnmounted(() => {
    document.removeEventListener('click', handleClickOutside);
    clearInterval(interval);
  });
});
</script>

<style scoped>
/* Pulsing animation for connecting state */
@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}

.animate-pulse {
  animation: pulse 1.5s ease-in-out infinite;
}

/* Spinning animation for loading states */
@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.animate-spin {
  animation: spin 1s linear infinite;
}

/* Container class for click outside detection */
.connection-status-container {
  position: relative;
}
</style>

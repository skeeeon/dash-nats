<template>
  <div
    v-if="shouldShowBanner"
    :class="[
      'w-full px-4 py-3 text-sm font-medium text-center',
      'transition-all duration-300 ease-in-out',
      bannerClasses
    ]"
    role="alert"
  >
    <div class="flex items-center justify-center gap-2">
      <!-- Warning Icon -->
      <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
              d="M12 9v2m0 4h.01m-4.69 4.682c-.29-.29-.29-.76 0-1.06L16.95 4.95c.29-.29.76-.29 1.06 0l8.485 8.485c.29.29.29.76 0 1.06L17.05 23.05c-.29.29-.76.29-1.06 0L8.464 14.525c-.29-.29-.29-.76 0-1.06z" />
      </svg>
      
      <!-- Banner Text -->
      <span>{{ bannerMessage }}</span>
      
      <!-- Action Button (if applicable) -->
      <button
        v-if="showRetryButton"
        @click="handleRetry"
        :disabled="isRetrying"
        class="ml-2 px-3 py-1 text-xs bg-white/20 hover:bg-white/30 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span v-if="!isRetrying">Retry</span>
        <span v-else class="flex items-center gap-1">
          <svg class="w-3 h-3 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Retrying...
        </span>
      </button>
      
      <!-- Dismiss Button -->
      <button
        v-if="canDismiss"
        @click="handleDismiss"
        class="ml-2 p-1 hover:bg-white/20 rounded transition-colors"
        title="Dismiss banner"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useNatsConnection } from '@/composables/useNatsConnection.js';

// Props
const props = defineProps({
  /**
   * Force show the banner regardless of connection status
   */
  forceShow: {
    type: Boolean,
    default: false
  },
  
  /**
   * Allow user to dismiss the banner
   */
  dismissible: {
    type: Boolean,
    default: true
  },
  
  /**
   * Auto-hide after specified milliseconds
   */
  autoHide: {
    type: Number,
    default: null
  },
  
  /**
   * Custom message override
   */
  message: {
    type: String,
    default: null
  }
});

// Emits
const emit = defineEmits(['dismissed', 'retry']);

// Composables
const {
  isConnected,
  isConnecting,
  connectionError,
  connectionStatus,
  reconnect,
  canConnect
} = useNatsConnection();

// Local state
const isDismissed = ref(false);
const isRetrying = ref(false);
const isOnline = ref(navigator.onLine);
const autoHideTimer = ref(null);

// Computed properties
const shouldShowBanner = computed(() => {
  if (props.forceShow) return !isDismissed.value;
  if (isDismissed.value) return false;
  
  // Show if offline or not connected (but not while connecting)
  return !isOnline.value || (!isConnected.value && !isConnecting.value);
});

const bannerType = computed(() => {
  if (!isOnline.value) return 'offline';
  if (connectionError.value) return 'error';
  if (!isConnected.value) return 'disconnected';
  return 'info';
});

const bannerClasses = computed(() => {
  switch (bannerType.value) {
    case 'offline':
      return 'bg-red-600 text-white border-b border-red-700';
    case 'error':
      return 'bg-red-500 text-white border-b border-red-600';
    case 'disconnected':
      return 'bg-yellow-500 text-yellow-900 border-b border-yellow-600';
    default:
      return 'bg-blue-500 text-white border-b border-blue-600';
  }
});

const bannerMessage = computed(() => {
  if (props.message) return props.message;
  
  switch (bannerType.value) {
    case 'offline':
      return 'You are currently offline. Some features may not be available.';
    case 'error':
      return `Connection error: ${connectionError.value?.message || 'Unable to connect to NATS server'}`;
    case 'disconnected':
      return 'Not connected to NATS server. Connect to start using the dashboard.';
    default:
      return 'Connection status unknown';
  }
});

const showRetryButton = computed(() => {
  return (bannerType.value === 'error' || bannerType.value === 'disconnected') && 
         canConnect.value && 
         !isRetrying.value;
});

const canDismiss = computed(() => {
  return props.dismissible && bannerType.value !== 'offline';
});

// Methods
async function handleRetry() {
  if (isRetrying.value) return;
  
  try {
    isRetrying.value = true;
    
    if (bannerType.value === 'error' || bannerType.value === 'disconnected') {
      await reconnect();
    }
    
    emit('retry');
  } catch (error) {
    console.error('Retry failed:', error);
  } finally {
    isRetrying.value = false;
  }
}

function handleDismiss() {
  isDismissed.value = true;
  clearAutoHideTimer();
  emit('dismissed');
}

function clearAutoHideTimer() {
  if (autoHideTimer.value) {
    clearTimeout(autoHideTimer.value);
    autoHideTimer.value = null;
  }
}

function startAutoHideTimer() {
  if (props.autoHide && props.autoHide > 0) {
    clearAutoHideTimer();
    autoHideTimer.value = setTimeout(() => {
      handleDismiss();
    }, props.autoHide);
  }
}

function handleOnlineStatusChange() {
  isOnline.value = navigator.onLine;
  
  // Reset dismissed state when coming back online
  if (isOnline.value && isDismissed.value) {
    isDismissed.value = false;
  }
}

// Watchers
watch(() => shouldShowBanner.value, (newValue) => {
  if (newValue) {
    startAutoHideTimer();
  } else {
    clearAutoHideTimer();
  }
});

watch(() => connectionStatus.value, (newStatus) => {
  // Reset dismissed state on connection status change
  if (newStatus === 'connected') {
    isDismissed.value = false;
  }
});

// Lifecycle
onMounted(() => {
  // Listen for online/offline events
  window.addEventListener('online', handleOnlineStatusChange);
  window.addEventListener('offline', handleOnlineStatusChange);
  
  // Start auto-hide timer if banner should show
  if (shouldShowBanner.value) {
    startAutoHideTimer();
  }
});

onUnmounted(() => {
  window.removeEventListener('online', handleOnlineStatusChange);
  window.removeEventListener('offline', handleOnlineStatusChange);
  clearAutoHideTimer();
});
</script>

<style scoped>
/* Smooth slide down animation */
.banner-enter-active,
.banner-leave-active {
  transition: all 0.3s ease;
}

.banner-enter-from {
  transform: translateY(-100%);
  opacity: 0;
}

.banner-leave-to {
  transform: translateY(-100%);
  opacity: 0;
}

/* Spinning animation for retry button */
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
</style>

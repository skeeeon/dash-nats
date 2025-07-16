<template>
  <BaseCard
    :card-id="cardId"
    :title="title"
    :type="type"
    :status="cardStatus"
    :error="cardError"
    :is-loading="isLoading"
    :loading-text="loadingText"
    :is-active="isActive"
    :draggable="draggable"
    :show-status-text="showStatusText"
    :allow-title-edit="allowTitleEdit"
    @update:title="$emit('update:title', $event)"
    @remove="$emit('remove')"
    @configure="$emit('configure')"
    @activate="$emit('activate')"
  >
    <template #actions>
      <!-- Subscribe/Unsubscribe Button -->
      <button
        @click="toggleSubscription"
        :disabled="!isConnected || isLoading"
        :class="[
          'px-3 py-1 text-xs font-medium rounded-md transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-offset-2',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          isSubscribed 
            ? 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50'
            : 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50'
        ]"
        :title="isSubscribed ? 'Unsubscribe' : 'Subscribe'"
      >
        <div class="flex items-center gap-1">
          <svg 
            v-if="isLoading"
            class="w-3 h-3 animate-spin" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          
          <span>{{ isSubscribed ? 'Unsubscribe' : 'Subscribe' }}</span>
        </div>
      </button>
      
      <!-- Clear Messages Button -->
      <button
        v-if="messages.length > 0"
        @click="clearMessages"
        class="p-1.5 hover:bg-accent rounded-md transition-colors"
        title="Clear messages"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </template>
    
    <!-- Subscription Status -->
    <div v-if="!isSubscribed && subscriptionTopic" class="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
      <div class="flex items-center gap-2 text-yellow-700 dark:text-yellow-400">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span class="text-sm">Not subscribed to {{ subscriptionTopic }}</span>
      </div>
    </div>
    
    <!-- No Topic Configured -->
    <div v-if="!subscriptionTopic" class="text-center py-8">
      <div class="text-muted-foreground">
        <svg class="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2h4a1 1 0 110 2h-1v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6H3a1 1 0 110-2h4zM9 6V3h6v3H9z"/>
        </svg>
        <p class="text-sm">No topic configured</p>
        <p class="text-xs mt-1">Click configure to set a topic</p>
      </div>
    </div>
    
    <!-- Messages Display -->
    <div v-else-if="messages.length === 0 && isSubscribed" class="text-center py-8">
      <div class="text-muted-foreground">
        <svg class="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2 2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"/>
        </svg>
        <p class="text-sm">Waiting for messages...</p>
        <p class="text-xs mt-1">Subscribed to {{ subscriptionTopic }}</p>
      </div>
    </div>
    
    <!-- Messages List -->
    <div v-else class="space-y-2">
      <div 
        ref="messagesContainer"
        class="max-h-96 overflow-y-auto space-y-2 scrollbar-thin"
        :class="{ 'auto-scroll': autoScroll }"
      >
        <div
          v-for="message in displayedMessages"
          :key="message.id"
          class="p-3 bg-secondary/50 border border-border rounded-lg"
        >
          <!-- Message Header -->
          <div class="flex items-center justify-between text-xs mb-2">
            <span class="font-mono text-primary">{{ message.topic }}</span>
            <span class="text-muted-foreground">{{ formatTime(message.timestamp) }}</span>
          </div>
          
          <!-- Message Content -->
          <div class="text-sm">
            <div v-if="displayType === 'json'" class="space-y-1">
              <pre class="font-mono text-xs bg-background p-2 rounded border overflow-x-auto">{{ formatJson(message.payload) }}</pre>
            </div>
            
            <div v-else-if="displayType === 'raw'" class="space-y-1">
              <div class="font-mono text-xs bg-background p-2 rounded border break-all">
                {{ formatRaw(message.payload) }}
              </div>
            </div>
            
            <div v-else class="space-y-1">
              <div class="break-all">{{ formatDefault(message.payload) }}</div>
            </div>
          </div>
          
          <!-- Message Metadata -->
          <div class="flex items-center justify-between text-xs text-muted-foreground mt-2 pt-2 border-t border-border">
            <span>Size: {{ getMessageSize(message) }} bytes</span>
            <span>Type: {{ getMessageType(message.payload) }}</span>
          </div>
        </div>
      </div>
    </div>
    
    <template #footer>
      <div class="flex items-center justify-between text-xs text-muted-foreground">
        <div class="flex items-center gap-4">
          <span v-if="!isConnected" class="text-yellow-600 dark:text-yellow-400">
            Not connected
          </span>
          <span v-else-if="isSubscribed" class="text-green-600 dark:text-green-400">
            Subscribed to {{ subscriptionTopic }}
          </span>
          <span v-else-if="subscriptionTopic">
            Ready to subscribe
          </span>
          <span v-else>
            Not configured
          </span>
        </div>
        
        <div class="flex items-center gap-4">
          <span v-if="cardMetrics">
            {{ cardMetrics.messagesPerSecond.toFixed(1) }} msg/s
          </span>
          <span v-if="messages.length > 0">
            {{ messages.length }} messages
          </span>
        </div>
      </div>
    </template>
    
    <!-- Configuration Modal Content -->
    <template #configuration="{ close }">
      <div class="space-y-6">
        <div>
          <h4 class="text-sm font-medium text-foreground mb-3">Subscription Configuration</h4>
          
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-foreground mb-1">
                Topic
              </label>
              <input
                v-model="configTopic"
                type="text"
                class="w-full px-3 py-2 border border-input rounded-md bg-background"
                placeholder="nats.topic"
              />
              <p class="text-xs text-muted-foreground mt-1">
                NATS topic to subscribe to (supports wildcards like *.topic)
              </p>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-foreground mb-1">
                Display Type
              </label>
              <select
                v-model="configDisplayType"
                class="w-full px-3 py-2 border border-input rounded-md bg-background"
              >
                <option value="json">JSON (formatted)</option>
                <option value="raw">Raw text</option>
                <option value="default">Auto-detect</option>
              </select>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-foreground mb-1">
                Max Messages
              </label>
              <input
                v-model.number="configMaxMessages"
                type="number"
                min="10"
                max="1000"
                class="w-full px-3 py-2 border border-input rounded-md bg-background"
              />
              <p class="text-xs text-muted-foreground mt-1">
                Maximum number of messages to keep in memory
              </p>
            </div>
            
            <div class="flex items-center gap-2">
              <input
                v-model="configAutoScroll"
                type="checkbox"
                class="rounded border-gray-300 text-primary focus:ring-primary"
              />
              <label class="text-sm font-medium text-foreground">
                Auto-scroll to latest messages
              </label>
            </div>
          </div>
        </div>
        
        <div class="flex justify-end gap-3">
          <button
            @click="close"
            class="px-4 py-2 border border-input rounded-md hover:bg-accent transition-colors"
          >
            Cancel
          </button>
          <button
            @click="saveConfiguration(close)"
            class="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </template>
  </BaseCard>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue';
import { useCards } from '@/composables/useCards.js';
import { useNatsConnection } from '@/composables/useNatsConnection.js';
import { useToast } from '@/composables/useToast.js';
import BaseCard from './BaseCard.vue';

// Props
const props = defineProps({
  cardId: { type: String, required: true },
  title: { type: String, default: 'Subscriber' },
  type: { type: String, default: 'subscriber' },
  status: { type: String, default: 'idle' },
  error: { type: String, default: null },
  isLoading: { type: Boolean, default: false },
  loadingText: { type: String, default: 'Loading...' },
  isActive: { type: Boolean, default: false },
  draggable: { type: Boolean, default: true },
  showStatusText: { type: Boolean, default: false },
  allowTitleEdit: { type: Boolean, default: true },
  config: { type: Object, default: () => ({}) }
});

// Emits
const emit = defineEmits(['update:title', 'remove', 'configure', 'activate']);

// Composables
const { 
  subscribe, 
  unsubscribe, 
  getCardMessages, 
  getCardMetrics,
  isCardSubscribed,
  getCardState,
  clearMessages: clearCardMessages,
  clearError 
} = useCards(props.cardId);

const { isConnected } = useNatsConnection();
const { success, error } = useToast();

// Local state
const messagesContainer = ref(null);
const configTopic = ref('');
const configDisplayType = ref('json');
const configMaxMessages = ref(100);
const configAutoScroll = ref(true);

// Computed properties
const cardState = computed(() => getCardState(props.cardId));
const cardStatus = computed(() => cardState.value?.status || 'idle');
const cardError = computed(() => cardState.value?.error || props.error);
const cardMetrics = computed(() => getCardMetrics(props.cardId));
const isSubscribed = computed(() => isCardSubscribed(props.cardId));
const messages = computed(() => getCardMessages(props.cardId, maxMessages.value));

const subscriptionTopic = computed(() => props.config.topic || '');
const displayType = computed(() => props.config.displayType || 'json');
const maxMessages = computed(() => props.config.maxMessages || 100);
const autoScroll = computed(() => props.config.autoScroll !== false);

const displayedMessages = computed(() => {
  return messages.value.slice().reverse(); // Show newest first
});

// Methods
async function toggleSubscription() {
  if (!subscriptionTopic.value) {
    error('Please configure a topic first');
    return;
  }
  
  try {
    if (isSubscribed.value) {
      await unsubscribe(props.cardId);
    } else {
      await subscribe(props.cardId, subscriptionTopic.value);
    }
  } catch (err) {
    console.error('[SubscriberCard] Toggle subscription failed:', err);
  }
}

function clearMessages() {
  clearCardMessages(props.cardId);
  success('Messages cleared');
}

function formatTime(timestamp) {
  return new Date(timestamp).toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit',
    second: '2-digit'
  });
}

function formatJson(payload) {
  try {
    if (typeof payload === 'string') {
      return JSON.stringify(JSON.parse(payload), null, 2);
    } else {
      return JSON.stringify(payload, null, 2);
    }
  } catch {
    return payload;
  }
}

function formatRaw(payload) {
  if (typeof payload === 'string') {
    return payload;
  }
  return JSON.stringify(payload);
}

function formatDefault(payload) {
  if (typeof payload === 'string') {
    return payload;
  }
  return JSON.stringify(payload, null, 2);
}

function getMessageSize(message) {
  return new Blob([JSON.stringify(message.payload)]).size;
}

function getMessageType(payload) {
  if (typeof payload === 'string') {
    try {
      JSON.parse(payload);
      return 'JSON string';
    } catch {
      return 'string';
    }
  }
  return typeof payload;
}

function saveConfiguration(close) {
  try {
    const config = {
      topic: configTopic.value,
      displayType: configDisplayType.value,
      maxMessages: configMaxMessages.value,
      autoScroll: configAutoScroll.value
    };
    
    // This would emit an event to update the card configuration
    emit('configure', { config });
    
    success('Configuration saved');
    close();
  } catch (err) {
    error('Failed to save configuration');
    console.error('[SubscriberCard] Save configuration failed:', err);
  }
}

function loadConfiguration() {
  configTopic.value = props.config.topic || '';
  configDisplayType.value = props.config.displayType || 'json';
  configMaxMessages.value = props.config.maxMessages || 100;
  configAutoScroll.value = props.config.autoScroll !== false;
}

async function scrollToBottom() {
  if (autoScroll.value && messagesContainer.value) {
    await nextTick();
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
  }
}

// Watchers
watch(messages, () => {
  scrollToBottom();
}, { flush: 'post' });

// Lifecycle
onMounted(() => {
  console.log(`[SubscriberCard] Mounted subscriber card: ${props.cardId}`);
  loadConfiguration();
  
  // Auto-subscribe if topic is configured and connected
  if (subscriptionTopic.value && isConnected.value) {
    setTimeout(() => {
      subscribe(props.cardId, subscriptionTopic.value);
    }, 100);
  }
});

onUnmounted(() => {
  console.log(`[SubscriberCard] Unmounted subscriber card: ${props.cardId}`);
  
  // Unsubscribe when component unmounts
  if (isSubscribed.value) {
    unsubscribe(props.cardId);
  }
  
  clearError();
});
</script>

<style scoped>
/* Messages container styling */
.max-h-96 {
  max-height: 24rem;
}

.scrollbar-thin::-webkit-scrollbar {
  width: 6px;
}

.scrollbar-thin::-webkit-scrollbar-track {
  background: hsl(var(--background));
}

.scrollbar-thin::-webkit-scrollbar-thumb {
  background: hsl(var(--border));
  border-radius: 3px;
}

.scrollbar-thin::-webkit-scrollbar-thumb:hover {
  background: hsl(var(--border)/0.8);
}

/* Auto-scroll behavior */
.auto-scroll {
  scroll-behavior: smooth;
}

/* JSON formatting */
pre {
  white-space: pre-wrap;
  word-wrap: break-word;
  font-family: 'Courier New', monospace;
  font-size: 0.75rem;
  line-height: 1.4;
}

/* Message animations */
.message-enter-active {
  transition: all 0.3s ease;
}

.message-enter-from {
  opacity: 0;
  transform: translateY(-10px);
}

/* Loading spinner */
.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .max-h-96 {
    max-height: 16rem;
  }
  
  pre {
    font-size: 0.6875rem;
  }
}

/* Focus styles */
button:focus-visible {
  outline: 2px solid hsl(var(--primary));
  outline-offset: 2px;
}

/* Transition effects */
.transition-colors {
  transition: color 0.2s ease-in-out, background-color 0.2s ease-in-out;
}
</style>

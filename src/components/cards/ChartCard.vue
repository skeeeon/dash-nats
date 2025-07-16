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
        {{ isSubscribed ? 'Unsubscribe' : 'Subscribe' }}
      </button>
      
      <!-- Clear Data Button -->
      <button
        v-if="dataPoints.length > 0"
        @click="clearData"
        class="p-1.5 hover:bg-accent rounded-md transition-colors"
        title="Clear chart data"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </template>
    
    <!-- Chart Content -->
    <div class="space-y-3">
      <!-- No Topic Configured -->
      <div v-if="!subscriptionTopic" class="text-center py-8">
        <div class="text-muted-foreground">
          <svg class="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
          </svg>
          <p class="text-sm">No topic configured for chart</p>
          <p class="text-xs mt-1">Click configure to set up data visualization</p>
        </div>
      </div>
      
      <!-- Chart Area -->
      <div v-else class="space-y-2">
        <!-- Chart Title and Info -->
        <div class="flex items-center justify-between text-sm">
          <span class="font-medium">{{ subscriptionTopic }}</span>
          <span class="text-muted-foreground">
            {{ dataPoints.length }} points
          </span>
        </div>
        
        <!-- Placeholder Chart -->
        <div class="h-48 bg-secondary/20 border border-border rounded-lg flex items-center justify-center">
          <div class="text-center text-muted-foreground">
            <svg class="w-16 h-16 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
            </svg>
            <p class="text-lg font-medium">Chart Visualization</p>
            <p class="text-sm">Phase 3 Implementation</p>
            <p class="text-xs mt-2">
              {{ isSubscribed ? 'Collecting data...' : 'Subscribe to start collecting data' }}
            </p>
          </div>
        </div>
        
        <!-- Chart Stats -->
        <div class="grid grid-cols-3 gap-4 text-xs">
          <div class="text-center p-2 bg-secondary/30 rounded">
            <div class="font-medium">{{ dataPoints.length }}</div>
            <div class="text-muted-foreground">Data Points</div>
          </div>
          <div class="text-center p-2 bg-secondary/30 rounded">
            <div class="font-medium">{{ messagesPerSecond.toFixed(1) }}</div>
            <div class="text-muted-foreground">Msg/sec</div>
          </div>
          <div class="text-center p-2 bg-secondary/30 rounded">
            <div class="font-medium">{{ lastValue || 'N/A' }}</div>
            <div class="text-muted-foreground">Last Value</div>
          </div>
        </div>
        
        <!-- Recent Data Points -->
        <div v-if="dataPoints.length > 0" class="space-y-1">
          <div class="text-xs font-medium text-muted-foreground">Recent Data:</div>
          <div class="max-h-24 overflow-y-auto space-y-1">
            <div
              v-for="point in recentDataPoints"
              :key="point.timestamp"
              class="flex justify-between text-xs p-1 bg-secondary/20 rounded"
            >
              <span class="font-mono">{{ point.value }}</span>
              <span class="text-muted-foreground">{{ formatTime(point.timestamp) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <template #footer>
      <div class="flex items-center justify-between text-xs text-muted-foreground">
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
        
        <span v-if="dataPoints.length > 0">
          {{ dataPoints.length }} data points
        </span>
      </div>
    </template>
    
    <!-- Configuration Modal Content -->
    <template #configuration="{ close }">
      <div class="space-y-6">
        <div>
          <h4 class="text-sm font-medium text-foreground mb-3">Chart Configuration</h4>
          
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
            </div>
            
            <div>
              <label class="block text-sm font-medium text-foreground mb-1">
                JSON Path (for data extraction)
              </label>
              <input
                v-model="configJsonPath"
                type="text"
                class="w-full px-3 py-2 border border-input rounded-md bg-background"
                placeholder="payload.value"
              />
              <p class="text-xs text-muted-foreground mt-1">
                Path to extract numeric value from JSON messages
              </p>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-foreground mb-1">
                Chart Type
              </label>
              <select
                v-model="configChartType"
                class="w-full px-3 py-2 border border-input rounded-md bg-background"
              >
                <option value="line">Line Chart</option>
                <option value="bar">Bar Chart</option>
                <option value="area">Area Chart</option>
              </select>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-foreground mb-1">
                Max Data Points
              </label>
              <input
                v-model.number="configMaxPoints"
                type="number"
                min="10"
                max="1000"
                class="w-full px-3 py-2 border border-input rounded-md bg-background"
              />
            </div>
          </div>
        </div>
        
        <div class="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <div class="flex items-center gap-2 text-blue-700 dark:text-blue-400">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span class="text-sm font-medium">Phase 3 Feature</span>
          </div>
          <p class="text-sm text-blue-600 dark:text-blue-300 mt-1">
            Full chart visualization with real-time data plotting will be implemented in Phase 3.
          </p>
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
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useCards } from '@/composables/useCards.js';
import { useNatsConnection } from '@/composables/useNatsConnection.js';
import { useToast } from '@/composables/useToast.js';
import BaseCard from './BaseCard.vue';

// Props
const props = defineProps({
  cardId: { type: String, required: true },
  title: { type: String, default: 'Chart' },
  type: { type: String, default: 'chart' },
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
  clearMessages,
  clearError 
} = useCards(props.cardId);

const { isConnected } = useNatsConnection();
const { success, error } = useToast();

// Local state
const dataPoints = ref([]);
const configTopic = ref('');
const configJsonPath = ref('payload.value');
const configChartType = ref('line');
const configMaxPoints = ref(100);

// Computed properties
const cardState = computed(() => getCardState(props.cardId));
const cardStatus = computed(() => cardState.value?.status || 'idle');
const cardError = computed(() => cardState.value?.error || props.error);
const cardMetrics = computed(() => getCardMetrics(props.cardId));
const isSubscribed = computed(() => isCardSubscribed(props.cardId));
const messages = computed(() => getCardMessages(props.cardId, maxPoints.value));

const subscriptionTopic = computed(() => props.config.topic || '');
const jsonPath = computed(() => props.config.jsonPath || 'payload.value');
const chartType = computed(() => props.config.chartType || 'line');
const maxPoints = computed(() => props.config.maxPoints || 100);

const messagesPerSecond = computed(() => {
  return cardMetrics.value?.messagesPerSecond || 0;
});

const lastValue = computed(() => {
  if (dataPoints.value.length > 0) {
    return dataPoints.value[dataPoints.value.length - 1].value;
  }
  return null;
});

const recentDataPoints = computed(() => {
  return dataPoints.value.slice(-5).reverse();
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
    console.error('[ChartCard] Toggle subscription failed:', err);
  }
}

function clearData() {
  dataPoints.value = [];
  clearMessages(props.cardId);
  success('Chart data cleared');
}

function formatTime(timestamp) {
  return new Date(timestamp).toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit',
    second: '2-digit'
  });
}

function extractValueFromMessage(message) {
  try {
    // Simple JSON path extraction
    const path = jsonPath.value.split('.');
    let value = message;
    
    for (const key of path) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return null;
      }
    }
    
    // Convert to number if possible
    const numValue = Number(value);
    return isNaN(numValue) ? null : numValue;
  } catch (err) {
    console.error('[ChartCard] Failed to extract value:', err);
    return null;
  }
}

function processMessages() {
  const currentMessages = messages.value;
  const newDataPoints = [];
  
  currentMessages.forEach(message => {
    const value = extractValueFromMessage(message.payload);
    if (value !== null) {
      newDataPoints.push({
        timestamp: message.timestamp,
        value: value,
        raw: message.payload
      });
    }
  });
  
  // Sort by timestamp and keep only max points
  newDataPoints.sort((a, b) => a.timestamp - b.timestamp);
  if (newDataPoints.length > maxPoints.value) {
    newDataPoints.splice(0, newDataPoints.length - maxPoints.value);
  }
  
  dataPoints.value = newDataPoints;
}

function saveConfiguration(close) {
  try {
    const config = {
      topic: configTopic.value,
      jsonPath: configJsonPath.value,
      chartType: configChartType.value,
      maxPoints: configMaxPoints.value
    };
    
    emit('configure', { config });
    success('Configuration saved');
    close();
  } catch (err) {
    error('Failed to save configuration');
    console.error('[ChartCard] Save configuration failed:', err);
  }
}

function loadConfiguration() {
  configTopic.value = props.config.topic || '';
  configJsonPath.value = props.config.jsonPath || 'payload.value';
  configChartType.value = props.config.chartType || 'line';
  configMaxPoints.value = props.config.maxPoints || 100;
}

// Watch for new messages and process them
function watchMessages() {
  // This would be implemented with a proper watcher in a real app
  // For now, we'll process messages periodically
  const interval = setInterval(() => {
    if (isSubscribed.value) {
      processMessages();
    }
  }, 1000);
  
  return () => clearInterval(interval);
}

// Lifecycle
onMounted(() => {
  console.log(`[ChartCard] Mounted chart card: ${props.cardId}`);
  loadConfiguration();
  
  // Start watching messages
  const cleanup = watchMessages();
  
  // Auto-subscribe if configured
  if (subscriptionTopic.value && isConnected.value) {
    setTimeout(() => {
      subscribe(props.cardId, subscriptionTopic.value);
    }, 100);
  }
  
  // Cleanup on unmount
  onUnmounted(() => {
    cleanup();
  });
});

onUnmounted(() => {
  console.log(`[ChartCard] Unmounted chart card: ${props.cardId}`);
  
  // Unsubscribe when component unmounts
  if (isSubscribed.value) {
    unsubscribe(props.cardId);
  }
  
  clearError();
});
</script>

<style scoped>
/* Chart container styling */
.chart-container {
  position: relative;
  width: 100%;
  height: 200px;
}

/* Data points list styling */
.max-h-24 {
  max-height: 6rem;
}

/* Grid layout for stats */
.grid-cols-3 {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

/* Smooth transitions */
.transition-colors {
  transition: color 0.2s ease-in-out, background-color 0.2s ease-in-out;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .grid-cols-3 {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  
  .chart-container {
    height: 150px;
  }
}
</style>

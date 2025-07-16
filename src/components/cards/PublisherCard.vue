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
      <!-- Clear History Button -->
      <button
        v-if="publishHistory.length > 0"
        @click="clearHistory"
        class="p-1.5 hover:bg-accent rounded-md transition-colors"
        title="Clear publish history"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </template>
    
    <!-- Publisher Buttons -->
    <div class="space-y-3">
      <div v-if="buttons.length === 0" class="text-center py-8">
        <div class="text-muted-foreground">
          <svg class="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
          </svg>
          <p class="text-sm">No publish buttons configured</p>
          <p class="text-xs mt-1">Click configure to add buttons</p>
        </div>
      </div>
      
      <div v-else class="grid gap-2" :class="gridClasses">
        <button
          v-for="button in buttons"
          :key="button.id"
          @click="publishMessage(button)"
          :disabled="!isConnected || isPublishing"
          :class="[
            'px-4 py-2 rounded-md font-medium transition-all duration-200',
            'focus:outline-none focus:ring-2 focus:ring-offset-2',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'hover:scale-105 active:scale-95',
            getButtonClasses(button)
          ]"
          :style="getButtonStyle(button)"
          :title="getButtonTooltip(button)"
        >
          <div class="flex items-center justify-center gap-2">
            <svg 
              v-if="isPublishing && currentPublishingButton === button.id"
              class="w-4 h-4 animate-spin" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            
            <span>{{ button.label }}</span>
          </div>
        </button>
      </div>
    </div>
    
    <!-- Publish History -->
    <div v-if="showHistory && publishHistory.length > 0" class="mt-4 space-y-2">
      <div class="flex items-center justify-between">
        <h4 class="text-sm font-medium text-foreground">Recent Messages</h4>
        <button
          @click="showHistory = false"
          class="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Hide
        </button>
      </div>
      
      <div class="max-h-32 overflow-y-auto space-y-1">
        <div
          v-for="entry in publishHistory.slice(-5)"
          :key="entry.timestamp"
          class="text-xs p-2 bg-secondary/50 rounded border"
        >
          <div class="flex items-center justify-between mb-1">
            <span class="font-mono text-primary">{{ entry.topic }}</span>
            <span class="text-muted-foreground">{{ formatTime(entry.timestamp) }}</span>
          </div>
          <div class="text-muted-foreground truncate">
            {{ formatPayload(entry.payload) }}
          </div>
        </div>
      </div>
    </div>
    
    <!-- Show History Button -->
    <div v-else-if="publishHistory.length > 0" class="mt-4">
      <button
        @click="showHistory = true"
        class="w-full text-xs text-muted-foreground hover:text-foreground transition-colors py-2"
      >
        Show recent messages ({{ publishHistory.length }})
      </button>
    </div>
    
    <template #footer>
      <div class="flex items-center justify-between text-xs text-muted-foreground">
        <span v-if="!isConnected" class="text-yellow-600 dark:text-yellow-400">
          Not connected
        </span>
        <span v-else>
          Ready to publish
        </span>
        
        <span v-if="publishHistory.length > 0">
          {{ publishHistory.length }} sent
        </span>
      </div>
    </template>
    
    <!-- Configuration Modal Content -->
    <template #configuration="{ close }">
      <div class="space-y-6">
        <div>
          <h4 class="text-sm font-medium text-foreground mb-3">Publisher Buttons</h4>
          
          <div class="space-y-3">
            <div
              v-for="(button, index) in configButtons"
              :key="button.id"
              class="p-4 border border-border rounded-lg space-y-3"
            >
              <div class="flex items-center justify-between">
                <span class="text-sm font-medium">Button {{ index + 1 }}</span>
                <button
                  @click="removeButton(index)"
                  class="text-red-600 hover:text-red-700 text-sm"
                >
                  Remove
                </button>
              </div>
              
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-sm font-medium text-foreground mb-1">
                    Label
                  </label>
                  <input
                    v-model="button.label"
                    type="text"
                    class="w-full px-3 py-2 border border-input rounded-md bg-background"
                    placeholder="Button label"
                  />
                </div>
                
                <div>
                  <label class="block text-sm font-medium text-foreground mb-1">
                    Topic
                  </label>
                  <input
                    v-model="button.topic"
                    type="text"
                    class="w-full px-3 py-2 border border-input rounded-md bg-background"
                    placeholder="nats.topic"
                  />
                </div>
              </div>
              
              <div>
                <label class="block text-sm font-medium text-foreground mb-1">
                  Payload (JSON)
                </label>
                <textarea
                  v-model="button.payloadJson"
                  class="w-full px-3 py-2 border border-input rounded-md bg-background font-mono text-sm"
                  rows="3"
                  placeholder='{"message": "Hello World"}'
                />
              </div>
              
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-sm font-medium text-foreground mb-1">
                    Text Color
                  </label>
                  <input
                    v-model="button.style.color"
                    type="color"
                    class="w-full h-10 border border-input rounded-md"
                  />
                </div>
                
                <div>
                  <label class="block text-sm font-medium text-foreground mb-1">
                    Background Color
                  </label>
                  <input
                    v-model="button.style.bgColor"
                    type="color"
                    class="w-full h-10 border border-input rounded-md"
                  />
                </div>
              </div>
            </div>
          </div>
          
          <button
            @click="addButton"
            class="mt-3 w-full px-4 py-2 border border-input rounded-md hover:bg-accent transition-colors"
          >
            + Add Button
          </button>
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
  title: { type: String, default: 'Publisher' },
  type: { type: String, default: 'publisher' },
  status: { type: String, default: 'idle' },
  error: { type: String, default: null },
  isLoading: { type: Boolean, default: false },
  loadingText: { type: String, default: 'Publishing...' },
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
  publish, 
  getPublishHistory, 
  isCardPublishing, 
  getCardState,
  clearError 
} = useCards(props.cardId);

const { isConnected } = useNatsConnection();
const { success, error } = useToast();

// Local state
const showHistory = ref(false);
const currentPublishingButton = ref(null);
const configButtons = ref([]);

// Computed properties
const cardState = computed(() => getCardState(props.cardId));
const cardStatus = computed(() => cardState.value?.status || 'idle');
const cardError = computed(() => cardState.value?.error || props.error);
const isPublishing = computed(() => isCardPublishing(props.cardId));
const publishHistory = computed(() => getPublishHistory(props.cardId, 10));

const buttons = computed(() => {
  const configuredButtons = props.config.buttons || [];
  return configuredButtons.map(button => ({
    ...button,
    id: button.id || `btn_${Math.random().toString(36).substr(2, 9)}`,
    style: {
      color: button.style?.color || '#ffffff',
      bgColor: button.style?.bgColor || '#3b82f6'
    }
  }));
});

const gridClasses = computed(() => {
  const count = buttons.value.length;
  if (count === 1) return 'grid-cols-1';
  if (count === 2) return 'grid-cols-2';
  if (count <= 4) return 'grid-cols-2';
  return 'grid-cols-3';
});

// Methods
async function publishMessage(button) {
  if (!isConnected.value) {
    error('Not connected to NATS server');
    return;
  }
  
  if (!button.topic) {
    error('Topic is required');
    return;
  }
  
  try {
    currentPublishingButton.value = button.id;
    
    let payload = button.payload;
    
    // If payload is a string, try to parse as JSON
    if (typeof payload === 'string') {
      try {
        payload = JSON.parse(payload);
      } catch {
        // Use as string if not valid JSON
      }
    }
    
    const success_result = await publish(props.cardId, button.topic, payload);
    
    if (success_result) {
      console.log(`[PublisherCard] Published to ${button.topic}:`, payload);
    }
    
  } catch (err) {
    console.error('[PublisherCard] Publish failed:', err);
  } finally {
    currentPublishingButton.value = null;
  }
}

function getButtonClasses(button) {
  return [
    'focus:ring-2 focus:ring-offset-2',
    'shadow-sm hover:shadow-md',
    'border border-transparent'
  ];
}

function getButtonStyle(button) {
  return {
    color: button.style.color,
    backgroundColor: button.style.bgColor,
    borderColor: button.style.bgColor
  };
}

function getButtonTooltip(button) {
  return `Publish to: ${button.topic}`;
}

function clearHistory() {
  // This would call the cards store to clear history
  console.log('[PublisherCard] Clear history not implemented yet');
}

function formatTime(timestamp) {
  return new Date(timestamp).toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit',
    second: '2-digit'
  });
}

function formatPayload(payload) {
  if (typeof payload === 'string') {
    return payload;
  }
  return JSON.stringify(payload);
}

// Configuration methods
function addButton() {
  configButtons.value.push({
    id: `btn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    label: 'New Button',
    topic: '',
    payloadJson: '{"message": "Hello World"}',
    style: {
      color: '#ffffff',
      bgColor: '#3b82f6'
    }
  });
}

function removeButton(index) {
  configButtons.value.splice(index, 1);
}

function saveConfiguration(close) {
  try {
    // Convert payloadJson strings to objects
    const processedButtons = configButtons.value.map(button => {
      let payload;
      try {
        payload = JSON.parse(button.payloadJson || '{}');
      } catch {
        payload = button.payloadJson || '';
      }
      
      return {
        id: button.id,
        label: button.label,
        topic: button.topic,
        payload,
        style: button.style
      };
    });
    
    // This would emit an event to update the card configuration
    emit('configure', {
      config: {
        buttons: processedButtons
      }
    });
    
    success('Configuration saved');
    close();
  } catch (err) {
    error('Failed to save configuration');
    console.error('[PublisherCard] Save configuration failed:', err);
  }
}

function loadConfiguration() {
  // Load current configuration into editable form
  configButtons.value = buttons.value.map(button => ({
    ...button,
    payloadJson: typeof button.payload === 'string' 
      ? button.payload 
      : JSON.stringify(button.payload, null, 2)
  }));
}

// Lifecycle
onMounted(() => {
  console.log(`[PublisherCard] Mounted publisher card: ${props.cardId}`);
  loadConfiguration();
});

onUnmounted(() => {
  console.log(`[PublisherCard] Unmounted publisher card: ${props.cardId}`);
  clearError();
});
</script>

<style scoped>
/* Button hover effects */
button:hover {
  transform: translateY(-1px);
}

button:active {
  transform: translateY(0);
}

/* Loading spinner */
.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Grid responsive adjustments */
.grid-cols-1 { grid-template-columns: repeat(1, minmax(0, 1fr)); }
.grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }

/* Smooth transitions */
.transition-all {
  transition: all 0.2s ease-in-out;
}

/* History section styling */
.max-h-32 {
  max-height: 8rem;
}

/* Color picker styling */
input[type="color"] {
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;
  background: transparent;
  border: none;
  cursor: pointer;
}

input[type="color"]::-webkit-color-swatch {
  border: none;
  border-radius: 4px;
}

input[type="color"]::-moz-color-swatch {
  border: none;
  border-radius: 4px;
}
</style>

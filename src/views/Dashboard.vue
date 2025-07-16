<template>
  <div class="h-full flex flex-col">
    <!-- Dashboard Header -->
    <div class="flex-shrink-0 p-6 border-b border-border bg-background/95 backdrop-blur">
      <div class="flex items-center justify-between">
        <div>
          <div class="flex items-center gap-3">
            <h1 class="text-xl font-semibold text-foreground">{{ dashboardTitle }}</h1>
            <span v-if="hasCards" class="text-sm text-muted-foreground">
              {{ cards.length }} {{ cards.length === 1 ? 'card' : 'cards' }}
            </span>
          </div>
          <div class="text-muted-foreground text-sm mt-1">
            {{ connectionStatusMessage }}
          </div>
        </div>
        
        <div class="flex items-center gap-3">
          <!-- Add Card Button -->
          <button
            v-if="isConnected"
            @click="showAddCard = true"
            :disabled="isDashboardLoading"
            class="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span v-if="!isDashboardLoading">+ Add Card</span>
            <span v-else class="flex items-center gap-2">
              <svg class="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Adding...
            </span>
          </button>
          
          <!-- Dashboard Actions -->
          <div class="relative">
            <button
              @click="showDashboardMenu = !showDashboardMenu"
              class="p-2 hover:bg-accent rounded-md transition-colors"
              title="Dashboard options"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
            </button>
            
            <!-- Dashboard Menu -->
            <div
              v-if="showDashboardMenu"
              v-click-outside="() => showDashboardMenu = false"
              class="absolute right-0 top-full mt-2 w-48 bg-popover border border-border rounded-lg shadow-lg py-1 z-50"
            >
              <button
                @click="clearDashboard"
                :disabled="!hasCards"
                class="w-full px-4 py-2 text-left text-sm hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Clear Dashboard
              </button>
              <button
                @click="exportDashboard"
                :disabled="!hasCards"
                class="w-full px-4 py-2 text-left text-sm hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Export Dashboard
              </button>
              <button
                @click="importDashboard"
                class="w-full px-4 py-2 text-left text-sm hover:bg-accent transition-colors"
              >
                Import Dashboard
              </button>
              <div class="border-t border-border my-1"></div>
              <button
                @click="refreshDashboard"
                class="w-full px-4 py-2 text-left text-sm hover:bg-accent transition-colors"
              >
                Refresh Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Main Dashboard Content -->
    <div class="flex-1 overflow-hidden">
      <!-- Loading State -->
      <div v-if="isDashboardLoading && !hasCards" class="h-full flex items-center justify-center">
        <div class="text-center">
          <svg class="w-8 h-8 animate-spin mx-auto mb-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <p class="text-muted-foreground">{{ dashboardLoadingMessage }}</p>
        </div>
      </div>
      
      <!-- Connection Required State -->
      <div v-else-if="!isConnected" class="h-full flex items-center justify-center">
        <div class="text-center max-w-md mx-auto p-6">
          <div class="w-16 h-16 mx-auto mb-4 text-muted-foreground">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" 
                    d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
            </svg>
          </div>
          <h2 class="text-xl font-semibold text-foreground mb-2">Connect to NATS</h2>
          <p class="text-muted-foreground mb-4">
            You need to connect to a NATS server before you can use the dashboard.
          </p>
          <button
            @click="navigateToConnections"
            class="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors font-medium"
          >
            Configure Connection
          </button>
        </div>
      </div>
      
      <!-- Dashboard Grid (when connected) -->
      <div v-else class="h-full">
        <DashboardGrid
          ref="dashboardGrid"
          :dashboard-id="dashboardId"
          :show-status-text="showStatusText"
          :allow-title-edit="allowTitleEdit"
          :grid-options="gridOptions"
          @card-selected="handleCardSelected"
          @card-deselected="handleCardDeselected"
          @card-added="handleCardAdded"
          @card-removed="handleCardRemoved"
          @layout-changed="handleLayoutChanged"
        />
      </div>
    </div>
    
    <!-- Add Card Modal -->
    <div
      v-if="showAddCard"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      @click.self="showAddCard = false"
    >
      <div class="bg-background border border-border rounded-lg p-6 max-w-md w-full mx-4">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold">Add Card</h3>
          <button
            @click="showAddCard = false"
            class="p-1 hover:bg-accent rounded"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div class="space-y-3">
          <button
            @click="addCard('publisher')"
            :disabled="isDashboardLoading"
            class="w-full p-4 text-left border border-border rounded-lg hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div class="flex items-center gap-3">
              <svg class="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
              </svg>
              <div>
                <div class="font-medium">Publisher Card</div>
                <div class="text-sm text-muted-foreground">Send messages to NATS topics</div>
              </div>
            </div>
          </button>
          
          <button
            @click="addCard('subscriber')"
            :disabled="isDashboardLoading"
            class="w-full p-4 text-left border border-border rounded-lg hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div class="flex items-center gap-3">
              <svg class="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2 2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"/>
              </svg>
              <div>
                <div class="font-medium">Subscriber Card</div>
                <div class="text-sm text-muted-foreground">Receive messages from NATS topics</div>
              </div>
            </div>
          </button>
          
          <button
            @click="addCard('chart')"
            :disabled="isDashboardLoading"
            class="w-full p-4 text-left border border-border rounded-lg hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div class="flex items-center gap-3">
              <svg class="w-8 h-8 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
              </svg>
              <div>
                <div class="font-medium">Chart Card</div>
                <div class="text-sm text-muted-foreground">Visualize data from NATS topics</div>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useDashboardStore } from '@/stores/dashboard.js';
import { useNatsConnection } from '@/composables/useNatsConnection.js';
import { useToast } from '@/composables/useToast.js';
import DashboardGrid from '@/components/dashboard/DashboardGrid.vue';

// Router and route
const route = useRoute();
const router = useRouter();

// Composables
const dashboardStore = useDashboardStore();
const {
  isConnected,
  connectionStatusText,
  connectionError
} = useNatsConnection();

const { success, error, info } = useToast();

// Local reactive state
const dashboardGrid = ref(null);
const showAddCard = ref(false);
const showDashboardMenu = ref(false);
const isDashboardLoading = ref(false);
const dashboardLoadingMessage = ref('Loading...');
const selectedCardId = ref(null);

// Props and configuration
const dashboardId = computed(() => route.params.id || 'default');
const showStatusText = ref(false);
const allowTitleEdit = ref(true);
const gridOptions = ref({
  cellHeight: 100,
  margin: 5,
  animate: true,
  float: false,
  column: 12,
  maxRow: 0
});

// Computed properties
const activeDashboard = computed(() => dashboardStore.activeDashboard);
const hasCards = computed(() => dashboardStore.hasCards);
const cards = computed(() => activeDashboard.value?.cards || []);

const dashboardTitle = computed(() => {
  return activeDashboard.value?.name || 'Dashboard';
});

const connectionStatusMessage = computed(() => {
  if (!isConnected.value) {
    return connectionError.value 
      ? `Connection error: ${connectionError.value.message}`
      : 'Not connected to NATS';
  }
  return `Connected • ${connectionStatusText.value}`;
});

// Methods

/**
 * Navigate to connections page
 */
function navigateToConnections() {
  router.push({ name: 'connections' });
}

/**
 * Add a new card to the dashboard
 * @param {string} cardType - Type of card to add
 */
async function addCard(cardType) {
  if (!isConnected.value) {
    error('Must be connected to NATS to add cards');
    return;
  }

  try {
    isDashboardLoading.value = true;
    dashboardLoadingMessage.value = `Adding ${cardType} card...`;
    
    // Create default card configuration based on type
    const cardConfig = createDefaultCardConfig(cardType);
    
    // Add card to store
    const newCard = await dashboardStore.addCard(cardConfig);
    
    if (newCard) {
      success(`${cardType.charAt(0).toUpperCase() + cardType.slice(1)} card added`);
      
      // Close modal
      showAddCard.value = false;
      
      // Wait for the grid to update
      await nextTick();
      
      // The grid will automatically pick up the new card from the store
      console.log(`[Dashboard] Added card: ${newCard.id}`);
    }
  } catch (err) {
    console.error('[Dashboard] Failed to add card:', err);
    error(`Failed to add ${cardType} card: ${err.message}`);
  } finally {
    isDashboardLoading.value = false;
  }
}

/**
 * Clear all cards from the dashboard
 */
async function clearDashboard() {
  if (!hasCards.value) {
    info('Dashboard is already empty');
    return;
  }

  const confirmMessage = `Are you sure you want to remove all ${cards.value.length} cards? This cannot be undone.`;
  
  if (confirm(confirmMessage)) {
    try {
      isDashboardLoading.value = true;
      dashboardLoadingMessage.value = 'Clearing dashboard...';
      
      // Remove all cards from store
      const cardIds = cards.value.map(card => card.id);
      
      for (const cardId of cardIds) {
        await dashboardStore.removeCard(cardId);
      }
      
      success('Dashboard cleared');
    } catch (err) {
      console.error('[Dashboard] Failed to clear dashboard:', err);
      error(`Failed to clear dashboard: ${err.message}`);
    } finally {
      isDashboardLoading.value = false;
    }
  }
  
  // Close menu
  showDashboardMenu.value = false;
}

/**
 * Export dashboard configuration
 */
function exportDashboard() {
  try {
    const config = dashboardStore.exportDashboard(dashboardId.value);
    
    if (!config) {
      error('No dashboard configuration to export');
      return;
    }
    
    const dataStr = JSON.stringify(config, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `dashboard-${config.name || 'export'}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    success('Dashboard exported successfully');
  } catch (err) {
    console.error('[Dashboard] Export failed:', err);
    error('Failed to export dashboard');
  }
  
  // Close menu
  showDashboardMenu.value = false;
}

/**
 * Import dashboard configuration
 */
function importDashboard() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  
  input.onchange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    try {
      isDashboardLoading.value = true;
      dashboardLoadingMessage.value = 'Importing dashboard...';
      
      const text = await file.text();
      const config = JSON.parse(text);
      
      const result = dashboardStore.importDashboard(config);
      
      if (result) {
        success('Dashboard imported successfully');
        
        // Refresh the dashboard grid
        await nextTick();
        if (dashboardGrid.value) {
          await dashboardGrid.value.refreshGrid();
        }
      } else {
        error('Failed to import dashboard');
      }
    } catch (err) {
      console.error('[Dashboard] Import failed:', err);
      error('Invalid dashboard file');
    } finally {
      isDashboardLoading.value = false;
    }
  };
  
  input.click();
  
  // Close menu
  showDashboardMenu.value = false;
}

/**
 * Refresh the dashboard
 */
async function refreshDashboard() {
  try {
    isDashboardLoading.value = true;
    dashboardLoadingMessage.value = 'Refreshing dashboard...';
    
    if (dashboardGrid.value) {
      await dashboardGrid.value.refreshGrid();
    }
    
    success('Dashboard refreshed');
  } catch (err) {
    console.error('[Dashboard] Refresh failed:', err);
    error('Failed to refresh dashboard');
  } finally {
    isDashboardLoading.value = false;
  }
  
  // Close menu
  showDashboardMenu.value = false;
}

/**
 * Handle card selection
 * @param {string} cardId - Selected card ID
 */
function handleCardSelected(cardId) {
  selectedCardId.value = cardId;
  console.log(`[Dashboard] Card selected: ${cardId}`);
}

/**
 * Handle card deselection
 */
function handleCardDeselected() {
  selectedCardId.value = null;
  console.log('[Dashboard] Card deselected');
}

/**
 * Handle card added event
 * @param {Object} card - Added card
 */
function handleCardAdded(card) {
  console.log(`[Dashboard] Card added: ${card.id}`);
}

/**
 * Handle card removed event
 * @param {string} cardId - Removed card ID
 */
function handleCardRemoved(cardId) {
  console.log(`[Dashboard] Card removed: ${cardId}`);
}

/**
 * Handle layout changed event
 * @param {Array} layout - New layout
 */
function handleLayoutChanged(layout) {
  console.log(`[Dashboard] Layout changed: ${layout.length} items`);
}

/**
 * Create default card configuration
 * @param {string} type - Card type
 * @returns {Object} Card configuration
 */
function createDefaultCardConfig(type) {
  const baseConfig = {
    type,
    title: `${type.charAt(0).toUpperCase() + type.slice(1)} Card`,
    config: {}
  };
  
  switch (type) {
    case 'publisher':
      return {
        ...baseConfig,
        config: {
          buttons: [{
            id: `btn_${Date.now()}`,
            label: 'Send Message',
            topic: 'test.topic',
            payload: { message: 'Hello World', timestamp: new Date().toISOString() },
            style: { color: '#ffffff', bgColor: '#3b82f6' }
          }]
        }
      };
      
    case 'subscriber':
      return {
        ...baseConfig,
        config: {
          topic: 'test.topic',
          displayType: 'json',
          maxMessages: 100,
          autoScroll: true
        }
      };
      
    case 'chart':
      return {
        ...baseConfig,
        config: {
          topic: 'test.topic',
          jsonPath: 'value',
          chartType: 'line',
          maxPoints: 100
        }
      };
      
    default:
      return baseConfig;
  }
}

/**
 * Handle keyboard shortcuts
 * @param {KeyboardEvent} event - Keyboard event
 */
function handleKeyboardShortcuts(event) {
  // Only handle shortcuts when not in input fields
  if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
    return;
  }
  
  if (event.ctrlKey || event.metaKey) {
    switch (event.key) {
      case 'k':
        event.preventDefault();
        if (isConnected.value) {
          showAddCard.value = true;
        }
        break;
        
      case 'e':
        event.preventDefault();
        exportDashboard();
        break;
        
      case 'i':
        event.preventDefault();
        importDashboard();
        break;
        
      case 'r':
        event.preventDefault();
        refreshDashboard();
        break;
    }
  }
  
  // Escape key handling
  if (event.key === 'Escape') {
    if (showAddCard.value) {
      showAddCard.value = false;
    } else if (showDashboardMenu.value) {
      showDashboardMenu.value = false;
    }
  }
}

// Lifecycle hooks
onMounted(async () => {
  console.log('[Dashboard] Mounting dashboard view');
  
  // Initialize dashboard store
  dashboardStore.initialize();
  
  // Set up keyboard shortcuts
  document.addEventListener('keydown', handleKeyboardShortcuts);
  
  // Wait for next tick to ensure DOM is ready
  await nextTick();
  console.log('[Dashboard] Dashboard view mounted');
});

onUnmounted(() => {
  console.log('[Dashboard] Unmounting dashboard view');
  
  // Clean up keyboard shortcuts
  document.removeEventListener('keydown', handleKeyboardShortcuts);
  
  // Clear selected card
  selectedCardId.value = null;
});
</script>

<style scoped>
/* Dashboard specific styles */
.dashboard-header {
  backdrop-filter: blur(8px);
}

/* Loading animation */
.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Modal backdrop */
.fixed.inset-0.bg-black\/50 {
  backdrop-filter: blur(2px);
}

/* Card type buttons in modal */
.card-type-button {
  transition: all 0.2s ease;
}

.card-type-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .dashboard-header {
    padding: 1rem;
  }
  
  .card-type-button {
    padding: 0.75rem;
  }
}
</style>

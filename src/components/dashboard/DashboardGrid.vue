<template>
  <div class="dashboard-grid-container h-full w-full overflow-hidden">
    <!-- Grid Container - GridStack will manage all widgets -->
    <div 
      ref="gridContainer"
      class="grid-stack h-full w-full"
      :class="{ 'grid-disabled': !isConnected }"
    >
      <!-- No v-for loop - GridStack manages widgets directly -->
    </div>
    
    <!-- Empty State -->
    <div 
      v-if="!hasCards && !isLoading"
      class="absolute inset-0 flex items-center justify-center pointer-events-none z-10"
    >
      <div class="text-center max-w-md">
        <div class="w-16 h-16 mx-auto mb-4 text-muted-foreground/50">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path 
              stroke-linecap="round" 
              stroke-linejoin="round" 
              stroke-width="1.5" 
              d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"
            />
          </svg>
        </div>
        <h3 class="text-lg font-semibold text-muted-foreground mb-2">
          {{ emptyStateTitle }}
        </h3>
        <p class="text-sm text-muted-foreground">
          {{ emptyStateMessage }}
        </p>
      </div>
    </div>
    
    <!-- Loading State -->
    <div 
      v-if="isLoading"
      class="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-20"
    >
      <div class="text-center">
        <svg class="w-8 h-8 animate-spin mx-auto mb-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        <p class="text-sm text-muted-foreground">{{ loadingMessage }}</p>
      </div>
    </div>
    
    <!-- Grid Overlay (for drag operations) -->
    <div 
      v-if="isDragging"
      class="absolute inset-0 bg-primary/5 pointer-events-none grid-overlay"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue';
import { GridStack } from 'gridstack';
import { useDashboardStore } from '@/stores/dashboard.js';
import { useNatsConnection } from '@/composables/useNatsConnection.js';
import { useToast } from '@/composables/useToast.js';

// Import GridStack CSS
import 'gridstack/dist/gridstack.min.css';

// Props
const props = defineProps({
  dashboardId: {
    type: String,
    default: 'default'
  },
  showStatusText: {
    type: Boolean,
    default: false
  },
  allowTitleEdit: {
    type: Boolean,
    default: true
  },
  gridOptions: {
    type: Object,
    default: () => ({})
  }
});

// Emits
const emit = defineEmits(['card-selected', 'card-deselected', 'card-added', 'card-removed', 'layout-changed']);

// Composables
const dashboardStore = useDashboardStore();
const { isConnected } = useNatsConnection();
const { success, error } = useToast();

// Local state
const gridContainer = ref(null);
const selectedCardId = ref(null);
const isDragging = ref(false);
const isLoading = ref(false);
const loadingMessage = ref('Loading...');

// GridStack instance - NOT reactive
let gridInstance = null;

// Track Vue component instances for cleanup
const componentInstances = new Map();

// Computed properties
const activeDashboard = computed(() => dashboardStore.activeDashboard);
const cards = computed(() => activeDashboard.value.cards || []);
const hasCards = computed(() => cards.value.length > 0);
const gridLayout = computed(() => activeDashboard.value.gridLayout || []);

const emptyStateTitle = computed(() => {
  return isConnected.value ? 'No Cards' : 'Not Connected';
});

const emptyStateMessage = computed(() => {
  return isConnected.value 
    ? 'Add your first card to start building your dashboard'
    : 'Connect to NATS to start adding cards';
});

const defaultGridOptions = computed(() => ({
  cellHeight: 100,
  margin: 5,
  animate: true,
  float: false,
  column: 12,
  maxRow: 0,
  resizable: {
    handles: 'e, se, s, sw, w'
  },
  draggable: {
    handle: '.card-drag-handle, .card-header'
  },
  acceptWidgets: false,
  alwaysShowResizeHandle: false,
  disableOneColumnMode: true,
  ...props.gridOptions
}));

// Methods

/**
 * Initialize the GridStack instance
 */
async function initializeGrid() {
  if (!gridContainer.value) {
    console.warn('[DashboardGrid] Grid container not available');
    return;
  }
  
  try {
    console.log('[DashboardGrid] Initializing GridStack...');
    isLoading.value = true;
    loadingMessage.value = 'Initializing dashboard...';
    
    // Initialize GridStack
    gridInstance = GridStack.init(defaultGridOptions.value, gridContainer.value);
    
    // Set up event listeners
    setupGridEventListeners();
    
    // Load existing widgets
    await loadWidgets();
    
    console.log('[DashboardGrid] GridStack initialized successfully');
    
  } catch (err) {
    console.error('[DashboardGrid] Failed to initialize GridStack:', err);
    error('Failed to initialize dashboard grid');
  } finally {
    isLoading.value = false;
  }
}

/**
 * Setup GridStack event listeners
 */
function setupGridEventListeners() {
  if (!gridInstance) return;
  
  // Drag events
  gridInstance.on('dragstart', (event, el) => {
    isDragging.value = true;
    const cardId = el.getAttribute('gs-id');
    console.log('[DashboardGrid] Drag start:', cardId);
  });
  
  gridInstance.on('dragstop', (event, el) => {
    isDragging.value = false;
    const cardId = el.getAttribute('gs-id');
    console.log('[DashboardGrid] Drag stop:', cardId);
    updateLayout();
  });
  
  // Resize events
  gridInstance.on('resizestart', (event, el) => {
    const cardId = el.getAttribute('gs-id');
    console.log('[DashboardGrid] Resize start:', cardId);
  });
  
  gridInstance.on('resizestop', (event, el) => {
    const cardId = el.getAttribute('gs-id');
    console.log('[DashboardGrid] Resize stop:', cardId);
    updateLayout();
  });
  
  // General change event
  gridInstance.on('change', (event, items) => {
    if (items && items.length > 0) {
      console.log('[DashboardGrid] Layout changed:', items.length, 'items');
      updateLayout();
    }
  });
  
  // Added/removed events
  gridInstance.on('added', (event, items) => {
    console.log('[DashboardGrid] Items added:', items.length);
  });
  
  gridInstance.on('removed', (event, items) => {
    console.log('[DashboardGrid] Items removed:', items.length);
  });
}

/**
 * Load existing widgets into the grid
 */
async function loadWidgets() {
  if (!gridInstance) return;
  
  console.log('[DashboardGrid] Loading widgets:', cards.value.length);
  
  try {
    isLoading.value = true;
    loadingMessage.value = 'Loading cards...';
    
    // Clear existing widgets
    gridInstance.removeAll();
    
    // Clean up old component instances
    componentInstances.forEach(({ app }) => {
      try {
        app.unmount();
      } catch (err) {
        console.warn('[DashboardGrid] Error unmounting component:', err);
      }
    });
    componentInstances.clear();
    
    // Load widgets from store
    gridInstance.batchUpdate();
    
    for (const card of cards.value) {
      const layout = gridLayout.value.find(l => l.id === card.id);
      
      const widgetEl = gridInstance.addWidget({
        x: layout?.x || 0,
        y: layout?.y || 0,
        w: layout?.w || getDefaultWidth(card.type),
        h: layout?.h || getDefaultHeight(card.type),
        id: card.id,
        content: '' // Empty content - we'll mount Vue component
      });
      
      // Add the card-drag-handle class to the content area
      const contentEl = widgetEl.querySelector('.grid-stack-item-content');
      if (contentEl) {
        contentEl.classList.add('card-drag-handle');
      }
      
      // Render Vue component in the widget
      await renderVueComponent(widgetEl, card);
    }
    
    gridInstance.commit();
    
    console.log('[DashboardGrid] Loaded', cards.value.length, 'widgets');
    
  } catch (err) {
    console.error('[DashboardGrid] Error loading widgets:', err);
    error('Failed to load dashboard cards');
  } finally {
    isLoading.value = false;
  }
}

/**
 * Render Vue component into GridStack widget
 */
async function renderVueComponent(widgetEl, card) {
  if (!widgetEl) return;
  
  const contentEl = widgetEl.querySelector('.grid-stack-item-content');
  if (!contentEl) return;
  
  try {
    // Dynamic import to avoid circular dependencies
    const { createApp } = await import('vue');
    const CardWrapper = (await import('@/components/cards/CardWrapper.vue')).default;
    
    // Create Vue app instance for this widget
    const app = createApp(CardWrapper, {
      card,
      isSelected: selectedCardId.value === card.id,
      draggable: true,
      resizable: true,
      showStatusText: props.showStatusText,
      allowTitleEdit: props.allowTitleEdit,
      onSelect: (cardId) => {
        selectedCardId.value = cardId;
        emit('card-selected', cardId);
      },
      onDeselect: () => {
        selectedCardId.value = null;
        emit('card-deselected');
      },
      onRemove: (cardId) => {
        removeWidget(cardId);
      },
      onUpdate: (cardData) => {
        dashboardStore.updateCard(cardData.id, cardData);
      }
    });
    
    // Mount the app
    app.mount(contentEl);
    
    // Store the app instance for cleanup
    componentInstances.set(card.id, { app, element: widgetEl });
    
    console.log('[DashboardGrid] Rendered component for card:', card.id);
    
  } catch (err) {
    console.error('[DashboardGrid] Failed to render component for card:', card.id, err);
    
    // Show error in the widget
    const contentEl = widgetEl.querySelector('.grid-stack-item-content');
    if (contentEl) {
      contentEl.innerHTML = `
        <div class="flex items-center justify-center h-full text-red-500">
          <div class="text-center">
            <svg class="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span class="text-sm">Error loading card</span>
          </div>
        </div>
      `;
    }
  }
}

/**
 * Add a new widget to the grid
 */
async function addWidget(card) {
  if (!gridInstance) {
    console.warn('[DashboardGrid] Cannot add widget: GridStack not initialized');
    return;
  }
  
  try {
    isLoading.value = true;
    loadingMessage.value = 'Adding card...';
    
    const widgetEl = gridInstance.addWidget({
      x: 0,
      y: 0,
      w: getDefaultWidth(card.type),
      h: getDefaultHeight(card.type),
      id: card.id,
      content: ''
    });
    
    // Add the card-drag-handle class
    const contentEl = widgetEl.querySelector('.grid-stack-item-content');
    if (contentEl) {
      contentEl.classList.add('card-drag-handle');
    }
    
    await renderVueComponent(widgetEl, card);
    
    console.log('[DashboardGrid] Added widget:', card.id);
    emit('card-added', card);
    
  } catch (err) {
    console.error('[DashboardGrid] Failed to add widget:', card.id, err);
    error('Failed to add card to dashboard');
  } finally {
    isLoading.value = false;
  }
}

/**
 * Remove a widget from the grid
 */
async function removeWidget(cardId) {
  if (!gridInstance) return;
  
  try {
    isLoading.value = true;
    loadingMessage.value = 'Removing card...';
    
    // Find the widget element
    const widgetEl = gridInstance.engine.nodes.find(n => n.id === cardId)?.el;
    if (widgetEl) {
      gridInstance.removeWidget(widgetEl);
    }
    
    // Cleanup Vue app
    const instance = componentInstances.get(cardId);
    if (instance) {
      try {
        instance.app.unmount();
      } catch (err) {
        console.warn('[DashboardGrid] Error unmounting component:', err);
      }
      componentInstances.delete(cardId);
    }
    
    // Remove from store
    dashboardStore.removeCard(cardId);
    
    console.log('[DashboardGrid] Removed widget:', cardId);
    emit('card-removed', cardId);
    
  } catch (err) {
    console.error('[DashboardGrid] Failed to remove widget:', cardId, err);
    error('Failed to remove card from dashboard');
  } finally {
    isLoading.value = false;
  }
}

/**
 * Update layout in store
 */
function updateLayout() {
  if (!gridInstance) return;
  
  try {
    const newLayout = gridInstance.save().map(item => ({
      id: item.id,
      x: item.x,
      y: item.y,
      w: item.w,
      h: item.h,
    }));
    
    dashboardStore.updateGridLayout(newLayout);
    emit('layout-changed', newLayout);
    
    console.log('[DashboardGrid] Layout updated:', newLayout.length, 'items');
  } catch (err) {
    console.error('[DashboardGrid] Failed to update layout:', err);
  }
}

/**
 * Get default width for card type
 */
function getDefaultWidth(type) {
  switch (type) {
    case 'publisher': return 4;
    case 'subscriber': return 6;
    case 'chart': return 8;
    default: return 4;
  }
}

/**
 * Get default height for card type
 */
function getDefaultHeight(type) {
  switch (type) {
    case 'publisher': return 3;
    case 'subscriber': return 4;
    case 'chart': return 6;
    default: return 3;
  }
}

/**
 * Refresh the grid layout
 */
async function refreshGrid() {
  if (gridInstance) {
    await nextTick();
    await loadWidgets();
  }
}

/**
 * Cleanup GridStack and all Vue apps
 */
function cleanup() {
  if (gridInstance) {
    try {
      // Cleanup all Vue apps
      componentInstances.forEach(({ app }) => {
        try {
          app.unmount();
        } catch (err) {
          console.warn('[DashboardGrid] Error unmounting component:', err);
        }
      });
      componentInstances.clear();
      
      // Destroy GridStack
      gridInstance.destroy();
      gridInstance = null;
      
      console.log('[DashboardGrid] Cleaned up GridStack');
    } catch (err) {
      console.error('[DashboardGrid] Cleanup failed:', err);
    }
  }
}

// Watchers
watch(() => cards.value.length, async (newLength, oldLength) => {
  if (gridInstance && newLength !== oldLength) {
    console.log('[DashboardGrid] Cards changed, reloading widgets');
    await nextTick();
    await loadWidgets();
  }
});

watch(() => activeDashboard.value.id, async (newId, oldId) => {
  if (newId !== oldId && gridInstance) {
    console.log('[DashboardGrid] Dashboard changed, reloading widgets');
    await nextTick();
    await loadWidgets();
  }
});

// Lifecycle
onMounted(async () => {
  console.log('[DashboardGrid] Mounting dashboard grid');
  await nextTick();
  await initializeGrid();
});

onUnmounted(() => {
  console.log('[DashboardGrid] Unmounting dashboard grid');
  cleanup();
});

// Expose methods for parent component
defineExpose({
  addWidget,
  removeWidget,
  refreshGrid,
  selectedCardId: computed(() => selectedCardId.value)
});
</script>

<style scoped>
/* Grid container styling */
.dashboard-grid-container {
  position: relative;
  width: 100%;
  height: 100%;
}

.grid-stack {
  position: relative;
  width: 100%;
  height: 100%;
}

/* Disabled state */
.grid-disabled {
  opacity: 0.6;
  pointer-events: none;
}

/* Grid overlay for drag operations */
.grid-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(59, 130, 246, 0.05);
  backdrop-filter: blur(1px);
  z-index: 999;
}

/* Empty state styling */
.dashboard-grid-container .absolute.inset-0 {
  z-index: 1;
}

/* GridStack overrides */
:deep(.grid-stack-item) {
  border-radius: 8px;
  overflow: hidden;
}

:deep(.grid-stack-item.grid-stack-item-removing) {
  opacity: 0.5;
  transform: scale(0.95);
  transition: all 0.3s ease;
}

:deep(.grid-stack-item > .grid-stack-item-content) {
  border-radius: 8px;
  overflow: hidden;
  height: 100%;
  width: 100%;
  cursor: move;
}

/* Resize handle styling */
:deep(.ui-resizable-handle) {
  background: hsl(var(--primary));
  opacity: 0;
  transition: opacity 0.2s ease;
}

:deep(.grid-stack-item:hover .ui-resizable-handle) {
  opacity: 0.3;
}

:deep(.grid-stack-item.ui-resizable-resizing .ui-resizable-handle) {
  opacity: 0.6;
}

/* Drag placeholder */
:deep(.grid-stack-placeholder) {
  background: hsl(var(--primary) / 0.1);
  border: 2px dashed hsl(var(--primary));
  border-radius: 8px;
}

/* Animation for card changes */
:deep(.grid-stack-item) {
  transition: transform 0.2s ease;
}

:deep(.grid-stack-item.grid-stack-item-moving) {
  z-index: 1000;
  transform: scale(1.02);
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
}

/* Loading animation */
.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>

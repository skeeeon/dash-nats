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
      v-if="!hasCards"
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
    
    <!-- Grid Overlay (for drag operations) -->
    <div 
      v-if="isDragging"
      class="absolute inset-0 bg-primary/5 pointer-events-none grid-overlay"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch, createApp } from 'vue';
import { GridStack } from 'gridstack';
import { useDashboardStore } from '@/stores/dashboard.js';
import { useNatsConnection } from '@/composables/useNatsConnection.js';
import { useToast } from '@/composables/useToast.js';
import CardWrapper from '@/components/cards/CardWrapper.vue';

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

// Local state - NOT reactive to avoid conflicts with GridStack
const gridContainer = ref(null);
const selectedCardId = ref(null);
const isDragging = ref(false);

// Store Vue app instances for each widget
const widgetApps = new Map();

// GridStack instance - NOT reactive
let gridInstance = null;

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
    handle: '.card-drag-handle'
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
function initializeGrid() {
  if (!gridContainer.value) {
    console.warn('[DashboardGrid] Grid container not available');
    return;
  }
  
  try {
    console.log('[DashboardGrid] Initializing GridStack...');
    
    // Initialize GridStack
    gridInstance = GridStack.init(defaultGridOptions.value, gridContainer.value);
    
    // Set up event listeners
    setupGridEventListeners();
    
    // Load existing widgets
    loadWidgets();
    
    console.log('[DashboardGrid] GridStack initialized successfully');
  } catch (err) {
    console.error('[DashboardGrid] Failed to initialize GridStack:', err);
    error('Failed to initialize dashboard grid');
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
}

/**
 * Load existing widgets into the grid
 */
function loadWidgets() {
  if (!gridInstance) return;
  
  console.log('[DashboardGrid] Loading widgets:', cards.value.length);
  
  // Clear existing widgets
  gridInstance.removeAll();
  
  // Load widgets from store
  gridInstance.batchUpdate();
  
  cards.value.forEach(card => {
    const layout = gridLayout.value.find(l => l.id === card.id);
    const widgetEl = gridInstance.addWidget({
      x: layout?.x || 0,
      y: layout?.y || 0,
      w: layout?.w || getDefaultWidth(card.type),
      h: layout?.h || getDefaultHeight(card.type),
      id: card.id,
    });
    
    // Render Vue component in the widget
    renderVueComponent(widgetEl, card);
  });
  
  gridInstance.commit();
  
  console.log('[DashboardGrid] Loaded', cards.value.length, 'widgets');
}

/**
 * Render Vue component into GridStack widget
 */
function renderVueComponent(widgetEl, card) {
  if (!widgetEl) return;
  
  const contentEl = widgetEl.querySelector('.grid-stack-item-content');
  if (!contentEl) return;
  
  try {
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
    widgetApps.set(card.id, app);
    
    console.log('[DashboardGrid] Rendered component for card:', card.id);
  } catch (err) {
    console.error('[DashboardGrid] Failed to render component for card:', card.id, err);
  }
}

/**
 * Add a new widget to the grid
 */
function addWidget(card) {
  if (!gridInstance) {
    console.warn('[DashboardGrid] Cannot add widget: GridStack not initialized');
    return;
  }
  
  try {
    const widgetEl = gridInstance.addWidget({
      x: 0,
      y: 0,
      w: getDefaultWidth(card.type),
      h: getDefaultHeight(card.type),
      id: card.id,
    });
    
    renderVueComponent(widgetEl, card);
    
    console.log('[DashboardGrid] Added widget:', card.id);
    emit('card-added', card);
  } catch (err) {
    console.error('[DashboardGrid] Failed to add widget:', card.id, err);
  }
}

/**
 * Remove a widget from the grid
 */
function removeWidget(cardId) {
  if (!gridInstance) return;
  
  try {
    // Find the widget element
    const widgetEl = gridInstance.engine.nodes.find(n => n.id === cardId)?.el;
    if (widgetEl) {
      gridInstance.removeWidget(widgetEl);
    }
    
    // Cleanup Vue app
    const app = widgetApps.get(cardId);
    if (app) {
      app.unmount();
      widgetApps.delete(cardId);
    }
    
    // Remove from store
    dashboardStore.removeCard(cardId);
    
    console.log('[DashboardGrid] Removed widget:', cardId);
    emit('card-removed', cardId);
  } catch (err) {
    console.error('[DashboardGrid] Failed to remove widget:', cardId, err);
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
function refreshGrid() {
  if (gridInstance) {
    nextTick(() => {
      loadWidgets();
    });
  }
}

/**
 * Cleanup GridStack and all Vue apps
 */
function cleanup() {
  if (gridInstance) {
    try {
      // Cleanup all Vue apps
      widgetApps.forEach((app) => {
        app.unmount();
      });
      widgetApps.clear();
      
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
watch(() => cards.value.length, (newLength, oldLength) => {
  if (gridInstance && newLength !== oldLength) {
    nextTick(() => {
      loadWidgets();
    });
  }
});

watch(() => activeDashboard.value.id, (newId, oldId) => {
  if (newId !== oldId && gridInstance) {
    nextTick(() => {
      loadWidgets();
    });
  }
});

// Lifecycle
onMounted(async () => {
  console.log('[DashboardGrid] Mounting dashboard grid');
  await nextTick();
  initializeGrid();
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
</style>

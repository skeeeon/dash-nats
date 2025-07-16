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
      v-if="cards.length === 0"
      class="absolute inset-0 flex items-center justify-center pointer-events-none"
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
import { ref, computed, onMounted, onUnmounted, nextTick, watch, createApp, h } from 'vue';
import { GridStack } from 'gridstack';
import { useDashboard } from '@/composables/useDashboard.js';
import { useCards } from '@/composables/useCards.js';
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
const { 
  activeDashboard, 
  hasCards, 
  gridOptions: defaultGridOptions,
  updateGridLayout,
  getCardLayout,
  addCard,
  removeCard: removeDashboardCard,
  updateCard: updateDashboardCard
} = useDashboard();

const { initializeCard, cleanupCard } = useCards();
const { isConnected } = useNatsConnection();
const { success, error } = useToast();

// Local state - NOT reactive to avoid conflicts with GridStack
let gridInstance = null;
const gridContainer = ref(null);
const selectedCardId = ref(null);
const isDragging = ref(false);
const isResizing = ref(false);

// Store Vue app instances for each widget
const widgetApps = new Map();

// Computed properties
const cards = computed(() => activeDashboard.value.cards || []);

const emptyStateTitle = computed(() => {
  return isConnected.value ? 'No Cards' : 'Not Connected';
});

const emptyStateMessage = computed(() => {
  return isConnected.value 
    ? 'Add your first card to start building your dashboard'
    : 'Connect to NATS to start adding cards';
});

const mergedGridOptions = computed(() => ({
  ...defaultGridOptions.value,
  ...props.gridOptions,
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
  rtl: false
}));

// Card dimension helpers
const cardDimensions = {
  publisher: { defaultW: 4, defaultH: 3, minW: 2, minH: 2 },
  subscriber: { defaultW: 6, defaultH: 5, minW: 3, minH: 3 },
  chart: { defaultW: 8, defaultH: 6, minW: 4, minH: 4 },
  default: { defaultW: 4, defaultH: 3, minW: 2, minH: 2 }
};

// Methods

/**
 * Initialize the GridStack instance
 */
async function initializeGrid() {
  try {
    if (!gridContainer.value) {
      console.warn('[DashboardGrid] Grid container not available');
      return;
    }
    
    // Initialize GridStack - keep as plain JavaScript object
    gridInstance = GridStack.init(mergedGridOptions.value, gridContainer.value);
    
    // Set up event listeners
    setupGridEventListeners();
    
    // Load existing cards
    await loadExistingCards();
    
    console.log('[DashboardGrid] Grid initialized successfully');
  } catch (err) {
    console.error('[DashboardGrid] Failed to initialize grid:', err);
    error('Failed to initialize dashboard grid');
  }
}

/**
 * Setup GridStack event listeners
 */
function setupGridEventListeners() {
  if (!gridInstance) return;
  
  // Widget added event - mount Vue component
  gridInstance.on('added', (event, items) => {
    items.forEach(item => {
      const cardId = item.id;
      const card = cards.value.find(c => c.id === cardId);
      if (card) {
        mountCardComponent(item.el, card);
      }
    });
  });
  
  // Widget removed event - unmount Vue component
  gridInstance.on('removed', (event, items) => {
    items.forEach(item => {
      const cardId = item.id;
      unmountCardComponent(cardId);
    });
  });
  
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
    saveGridLayout();
  });
  
  // Resize events
  gridInstance.on('resizestart', (event, el) => {
    isResizing.value = true;
    const cardId = el.getAttribute('gs-id');
    console.log('[DashboardGrid] Resize start:', cardId);
  });
  
  gridInstance.on('resizestop', (event, el) => {
    isResizing.value = false;
    const cardId = el.getAttribute('gs-id');
    console.log('[DashboardGrid] Resize stop:', cardId);
    saveGridLayout();
  });
  
  // General change event - sync with store
  gridInstance.on('change', (event, items) => {
    if (items && items.length > 0) {
      console.log('[DashboardGrid] Layout changed:', items);
      syncLayoutToStore(items);
      emit('layout-changed', items);
    }
  });
}

/**
 * Mount Vue component into GridStack widget
 */
function mountCardComponent(element, card) {
  const contentElement = element.querySelector('.grid-stack-item-content');
  if (!contentElement) return;
  
  // Create Vue app instance for this widget
  const app = createApp({
    render() {
      return h(CardWrapper, {
        card,
        isSelected: selectedCardId.value === card.id,
        draggable: true,
        resizable: true,
        showStatusText: props.showStatusText,
        allowTitleEdit: props.allowTitleEdit,
        onSelect: selectCard,
        onDeselect: deselectCard,
        onRemove: removeCard,
        onUpdate: updateCard,
        onResizeStart: handleCardResizeStart,
        onResize: handleCardResize,
        onResizeEnd: handleCardResizeEnd
      });
    }
  });
  
  // Mount the app
  app.mount(contentElement);
  
  // Store the app instance for cleanup
  widgetApps.set(card.id, app);
  
  console.log('[DashboardGrid] Mounted component for card:', card.id);
}

/**
 * Unmount Vue component from GridStack widget
 */
function unmountCardComponent(cardId) {
  const app = widgetApps.get(cardId);
  if (app) {
    app.unmount();
    widgetApps.delete(cardId);
    console.log('[DashboardGrid] Unmounted component for card:', cardId);
  }
}

/**
 * Load existing cards into the grid
 */
async function loadExistingCards() {
  if (!gridInstance) return;
  
  try {
    // Clear existing widgets
    gridInstance.removeAll();
    
    // Add cards to grid
    const widgets = cards.value.map(card => {
      const layout = getCardLayout(card.id);
      const dimensions = cardDimensions[card.type] || cardDimensions.default;
      
      return {
        id: card.id,
        x: layout?.x || 0,
        y: layout?.y || 0,
        w: layout?.w || dimensions.defaultW,
        h: layout?.h || dimensions.defaultH,
        minW: dimensions.minW,
        minH: dimensions.minH,
        content: '<div class="grid-stack-item-content h-full w-full"></div>'
      };
    });
    
    // Add widgets to grid (this will trigger 'added' event)
    gridInstance.addWidget(widgets);
    
    // Initialize card states
    for (const card of cards.value) {
      initializeCard(card.id, card);
    }
    
    console.log(`[DashboardGrid] Loaded ${cards.value.length} cards`);
  } catch (err) {
    console.error('[DashboardGrid] Failed to load cards:', err);
  }
}

/**
 * Add a new card to the grid
 */
async function addCardToGrid(cardConfig) {
  if (!gridInstance) {
    console.warn('[DashboardGrid] Grid not initialized');
    return;
  }
  
  try {
    // Add card to dashboard store
    const newCard = await addCard(cardConfig);
    
    // Get dimensions and layout
    const dimensions = cardDimensions[newCard.type] || cardDimensions.default;
    const layout = getCardLayout(newCard.id);
    
    // Create widget for GridStack
    const widget = {
      id: newCard.id,
      x: layout?.x || 0,
      y: layout?.y || 0,
      w: layout?.w || dimensions.defaultW,
      h: layout?.h || dimensions.defaultH,
      minW: dimensions.minW,
      minH: dimensions.minH,
      content: '<div class="grid-stack-item-content h-full w-full"></div>'
    };
    
    // Add widget to grid (this will trigger 'added' event)
    gridInstance.addWidget(widget);
    
    // Initialize card state
    initializeCard(newCard.id, newCard);
    
    console.log('[DashboardGrid] Added card to grid:', newCard.id);
    emit('card-added', newCard);
    
    return newCard;
  } catch (err) {
    console.error('[DashboardGrid] Failed to add card:', err);
    throw err;
  }
}

/**
 * Remove a card from the grid
 */
async function removeCardFromGrid(cardId) {
  if (!gridInstance) return;
  
  try {
    // Find the widget element
    const widget = gridInstance.getGridItems().find(el => el.getAttribute('gs-id') === cardId);
    
    if (widget) {
      // Remove from grid (this will trigger 'removed' event)
      gridInstance.removeWidget(widget);
    }
    
    // Cleanup card state
    await cleanupCard(cardId);
    
    // Remove from dashboard store
    await removeDashboardCard(cardId);
    
    // Deselect if this card was selected
    if (selectedCardId.value === cardId) {
      selectedCardId.value = null;
    }
    
    console.log('[DashboardGrid] Removed card from grid:', cardId);
    emit('card-removed', cardId);
  } catch (err) {
    console.error('[DashboardGrid] Failed to remove card:', err);
    throw err;
  }
}

/**
 * Sync GridStack layout changes to store
 */
function syncLayoutToStore(items) {
  const layoutItems = items.map(item => ({
    id: item.id,
    x: item.x,
    y: item.y,
    w: item.w,
    h: item.h
  }));
  
  updateGridLayout(layoutItems);
}

/**
 * Save current grid layout
 */
function saveGridLayout() {
  if (!gridInstance) return;
  
  try {
    const serializedLayout = gridInstance.save();
    syncLayoutToStore(serializedLayout);
    console.log('[DashboardGrid] Layout saved');
  } catch (err) {
    console.error('[DashboardGrid] Failed to save layout:', err);
  }
}

/**
 * Select a card
 */
function selectCard(cardId) {
  selectedCardId.value = cardId;
  emit('card-selected', cardId);
}

/**
 * Deselect current card
 */
function deselectCard() {
  selectedCardId.value = null;
  emit('card-deselected');
}

/**
 * Update card configuration
 */
function updateCard(cardData) {
  updateDashboardCard(cardData.id, cardData);
}

/**
 * Remove card
 */
function removeCard(cardId) {
  removeCardFromGrid(cardId);
}

/**
 * Handle card resize events
 */
function handleCardResizeStart(data) {
  isResizing.value = true;
  console.log('[DashboardGrid] Card resize start:', data.cardId);
}

function handleCardResize(data) {
  console.log('[DashboardGrid] Card resize:', data.cardId);
}

function handleCardResizeEnd(data) {
  isResizing.value = false;
  saveGridLayout();
  console.log('[DashboardGrid] Card resize end:', data.cardId);
}

/**
 * Refresh grid layout
 */
function refreshGrid() {
  if (gridInstance) {
    gridInstance.batchUpdate();
    gridInstance.commit();
  }
}

/**
 * Cleanup grid instance and all mounted components
 */
function cleanupGrid() {
  if (gridInstance) {
    try {
      // Unmount all Vue components
      widgetApps.forEach((app, cardId) => {
        app.unmount();
      });
      widgetApps.clear();
      
      // Destroy GridStack instance
      gridInstance.destroy();
      gridInstance = null;
      
      console.log('[DashboardGrid] Grid cleaned up');
    } catch (err) {
      console.error('[DashboardGrid] Failed to cleanup grid:', err);
    }
  }
}

// Watchers
watch(() => cards.value.length, (newLength, oldLength) => {
  if (gridInstance && newLength !== oldLength) {
    // Reload cards when collection changes
    nextTick(() => {
      loadExistingCards();
    });
  }
});

watch(() => props.dashboardId, (newId, oldId) => {
  if (newId !== oldId) {
    console.log('[DashboardGrid] Dashboard changed:', newId);
    nextTick(() => {
      loadExistingCards();
    });
  }
});

// Lifecycle
onMounted(async () => {
  console.log('[DashboardGrid] Mounting dashboard grid');
  
  // Initialize grid after DOM is ready
  await nextTick();
  await initializeGrid();
});

onUnmounted(() => {
  console.log('[DashboardGrid] Unmounting dashboard grid');
  
  // Cleanup all cards
  cards.value.forEach(card => {
    cleanupCard(card.id);
  });
  
  // Cleanup grid - CRUCIAL for proper cleanup
  cleanupGrid();
});

// Expose methods for parent component
defineExpose({
  addCard: addCardToGrid,
  removeCard: removeCardFromGrid,
  selectCard,
  deselectCard,
  refreshGrid,
  saveLayout: saveGridLayout,
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

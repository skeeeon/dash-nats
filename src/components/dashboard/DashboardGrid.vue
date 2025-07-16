<template>
  <div class="dashboard-grid-container h-full w-full overflow-hidden">
    <!-- Grid Container -->
    <div 
      ref="gridContainer"
      class="grid-stack h-full w-full"
      :class="{ 'grid-disabled': !isConnected }"
    >
      <!-- Grid Items (Cards) -->
      <div
        v-for="card in cards"
        :key="card.id"
        class="grid-stack-item"
        :data-gs-id="card.id"
        :data-gs-x="getCardLayout(card.id)?.x || 0"
        :data-gs-y="getCardLayout(card.id)?.y || 0"
        :data-gs-w="getCardLayout(card.id)?.w || getDefaultWidth(card.type)"
        :data-gs-h="getCardLayout(card.id)?.h || getDefaultHeight(card.type)"
        :data-gs-min-w="getMinWidth(card.type)"
        :data-gs-min-h="getMinHeight(card.type)"
        :data-gs-max-w="getMaxWidth(card.type)"
        :data-gs-max-h="getMaxHeight(card.type)"
      >
        <div class="grid-stack-item-content h-full w-full">
          <CardWrapper
            :card="card"
            :is-selected="selectedCardId === card.id"
            :draggable="true"
            :resizable="true"
            :show-status-text="showStatusText"
            :allow-title-edit="allowTitleEdit"
            @select="selectCard"
            @deselect="deselectCard"
            @remove="removeCard"
            @update="updateCard"
            @resize-start="handleCardResizeStart"
            @resize="handleCardResize"
            @resize-end="handleCardResizeEnd"
          >
            <!-- Configuration slot for specific card types -->
            <template #configuration="{ card, close }">
              <component
                :is="getCardConfigComponent(card.type)"
                :card="card"
                :close="close"
                @save="handleCardConfigSave"
              />
            </template>
          </CardWrapper>
        </div>
      </div>
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
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue';
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
  /**
   * Dashboard ID to display
   */
  dashboardId: {
    type: String,
    default: 'default'
  },
  
  /**
   * Whether to show status text in cards
   */
  showStatusText: {
    type: Boolean,
    default: false
  },
  
  /**
   * Whether to allow title editing
   */
  allowTitleEdit: {
    type: Boolean,
    default: true
  },
  
  /**
   * Grid options override
   */
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
  setGridInstance,
  updateGridLayout,
  getCardLayout,
  addCard,
  removeCard: removeDashboardCard,
  updateCard: updateDashboardCard
} = useDashboard();

const { initializeCard, cleanupCard } = useCards();
const { isConnected } = useNatsConnection();
const { success, error } = useToast();

// Local state
const gridContainer = ref(null);
const gridInstance = ref(null);
const selectedCardId = ref(null);
const isDragging = ref(false);
const isResizing = ref(false);

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
  // Core grid configuration
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
  // Event handlers
  acceptWidgets: false,
  alwaysShowResizeHandle: false,
  disableOneColumnMode: true,
  rtl: false
}));

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
    
    // Initialize GridStack
    gridInstance.value = GridStack.init(mergedGridOptions.value, gridContainer.value);
    
    // Set up event listeners
    setupGridEventListeners();
    
    // Register grid instance with dashboard store
    setGridInstance(gridInstance.value);
    
    // Load existing cards
    await loadCards();
    
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
  if (!gridInstance.value) return;
  
  // Drag start
  gridInstance.value.on('dragstart', (event, el) => {
    isDragging.value = true;
    const cardId = el.getAttribute('data-gs-id');
    console.log('[DashboardGrid] Drag start:', cardId);
  });
  
  // Drag stop
  gridInstance.value.on('dragstop', (event, el) => {
    isDragging.value = false;
    const cardId = el.getAttribute('data-gs-id');
    console.log('[DashboardGrid] Drag stop:', cardId);
    saveGridLayout();
  });
  
  // Resize start
  gridInstance.value.on('resizestart', (event, el) => {
    isResizing.value = true;
    const cardId = el.getAttribute('data-gs-id');
    console.log('[DashboardGrid] Resize start:', cardId);
  });
  
  // Resize stop
  gridInstance.value.on('resizestop', (event, el) => {
    isResizing.value = false;
    const cardId = el.getAttribute('data-gs-id');
    console.log('[DashboardGrid] Resize stop:', cardId);
    saveGridLayout();
  });
  
  // General change event
  gridInstance.value.on('change', (event, items) => {
    if (items && items.length > 0) {
      console.log('[DashboardGrid] Layout changed:', items);
      emit('layout-changed', items);
    }
  });
}

/**
 * Load existing cards into the grid
 */
async function loadCards() {
  if (!gridInstance.value) return;
  
  try {
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
  if (!gridInstance.value) {
    console.warn('[DashboardGrid] Grid not initialized');
    return;
  }
  
  try {
    // Add card to dashboard
    const newCard = await addCard(cardConfig);
    
    // Initialize card state
    initializeCard(newCard.id, newCard);
    
    // The card will be automatically added to the grid through Vue reactivity
    await nextTick();
    
    // Make the grid re-layout
    gridInstance.value.batchUpdate();
    gridInstance.value.commit();
    
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
  if (!gridInstance.value) return;
  
  try {
    // Cleanup card state
    await cleanupCard(cardId);
    
    // Remove from dashboard
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
 * Save current grid layout
 */
function saveGridLayout() {
  if (!gridInstance.value) return;
  
  try {
    const serializedLayout = gridInstance.value.save();
    const layoutItems = serializedLayout.map(item => ({
      id: item.id,
      x: item.x,
      y: item.y,
      w: item.w,
      h: item.h
    }));
    
    updateGridLayout(layoutItems);
    console.log('[DashboardGrid] Layout saved');
  } catch (err) {
    console.error('[DashboardGrid] Failed to save layout:', err);
  }
}

/**
 * Get card layout or default
 */
function getCardLayout(cardId) {
  return getCardLayout(cardId) || null;
}

/**
 * Get default width for card type
 */
function getDefaultWidth(cardType) {
  switch (cardType) {
    case 'publisher': return 4;
    case 'subscriber': return 6;
    case 'chart': return 8;
    default: return 4;
  }
}

/**
 * Get default height for card type
 */
function getDefaultHeight(cardType) {
  switch (cardType) {
    case 'publisher': return 3;
    case 'subscriber': return 5;
    case 'chart': return 6;
    default: return 3;
  }
}

/**
 * Get minimum width for card type
 */
function getMinWidth(cardType) {
  switch (cardType) {
    case 'publisher': return 2;
    case 'subscriber': return 3;
    case 'chart': return 4;
    default: return 2;
  }
}

/**
 * Get minimum height for card type
 */
function getMinHeight(cardType) {
  switch (cardType) {
    case 'publisher': return 2;
    case 'subscriber': return 3;
    case 'chart': return 4;
    default: return 2;
  }
}

/**
 * Get maximum width for card type
 */
function getMaxWidth(cardType) {
  return 12; // Full width
}

/**
 * Get maximum height for card type
 */
function getMaxHeight(cardType) {
  return 20; // Reasonable maximum
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
 * Handle card resize start
 */
function handleCardResizeStart(data) {
  isResizing.value = true;
  console.log('[DashboardGrid] Card resize start:', data.cardId);
}

/**
 * Handle card resize
 */
function handleCardResize(data) {
  // This is handled by GridStack itself
}

/**
 * Handle card resize end
 */
function handleCardResizeEnd(data) {
  isResizing.value = false;
  saveGridLayout();
  console.log('[DashboardGrid] Card resize end:', data.cardId);
}

/**
 * Handle card configuration save
 */
function handleCardConfigSave(data) {
  updateCard(data);
  success('Card configuration saved');
}

/**
 * Get card configuration component
 */
function getCardConfigComponent(cardType) {
  // Return default configuration component
  // In a more advanced implementation, this would return type-specific components
  return {
    template: `
      <div class="text-sm text-muted-foreground text-center py-8">
        <p>Configuration for {{ cardType }} cards</p>
        <p class="text-xs mt-2">This will be implemented in Phase 3</p>
      </div>
    `,
    props: ['card', 'close'],
    emits: ['save']
  };
}

/**
 * Cleanup grid instance
 */
function cleanupGrid() {
  if (gridInstance.value) {
    try {
      gridInstance.value.destroy();
      gridInstance.value = null;
      console.log('[DashboardGrid] Grid cleaned up');
    } catch (err) {
      console.error('[DashboardGrid] Failed to cleanup grid:', err);
    }
  }
}

/**
 * Refresh grid layout
 */
function refreshGrid() {
  if (gridInstance.value) {
    gridInstance.value.batchUpdate();
    gridInstance.value.commit();
  }
}

// Watchers
watch(() => cards.value.length, (newLength, oldLength) => {
  if (gridInstance.value && newLength !== oldLength) {
    // Refresh grid when cards change
    nextTick(() => {
      refreshGrid();
    });
  }
});

watch(() => props.dashboardId, (newId, oldId) => {
  if (newId !== oldId) {
    console.log('[DashboardGrid] Dashboard changed:', newId);
    // Reload cards for new dashboard
    nextTick(() => {
      loadCards();
    });
  }
});

// Lifecycle
onMounted(async () => {
  console.log('[DashboardGrid] Mounting dashboard grid');
  
  // Initialize grid after DOM is ready
  await nextTick();
  initializeGrid();
});

onUnmounted(() => {
  console.log('[DashboardGrid] Unmounting dashboard grid');
  
  // Cleanup all cards
  cards.value.forEach(card => {
    cleanupCard(card.id);
  });
  
  // Cleanup grid
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

/* Grid item styling */
.grid-stack-item {
  position: absolute;
}

.grid-stack-item-content {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
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

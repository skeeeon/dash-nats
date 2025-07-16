<template>
  <div 
    :class="[
      'card-wrapper relative transition-all duration-200 h-full w-full',
      'hover:z-10',
      isSelected ? 'z-20' : ''
    ]"
    :data-card-id="card.id"
    @click="handleCardClick"
  >
    <!-- Loading state while component loads -->
    <div v-if="isLoadingComponent" class="flex items-center justify-center h-full">
      <div class="text-center">
        <svg class="w-8 h-8 animate-spin mx-auto mb-2 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        <span class="text-sm text-muted-foreground">Loading...</span>
      </div>
    </div>

    <!-- Error state if component fails to load -->
    <div v-else-if="componentError" class="flex items-center justify-center h-full">
      <div class="text-center text-red-500">
        <svg class="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span class="text-sm">Failed to load card</span>
      </div>
    </div>

    <!-- Actual Card Component -->
    <component 
      v-else-if="resolvedComponent"
      :is="resolvedComponent"
      :card-id="card.id"
      :title="card.title"
      :type="card.type"
      :status="cardState?.status || 'idle'"
      :error="cardState?.error"
      :is-loading="isLoading"
      :loading-text="loadingText"
      :is-active="isSelected"
      :draggable="draggable"
      :resizable="resizable"
      :show-status-text="showStatusText"
      :allow-title-edit="allowTitleEdit"
      :config="card.config"
      @update:title="handleTitleUpdate"
      @remove="handleRemove"
      @configure="handleConfigure"
      @activate="handleActivate"
    >
      <!-- Pass through slots -->
      <template v-for="(_, slot) in $slots" v-slot:[slot]="scope">
        <slot :name="slot" v-bind="scope" />
      </template>
    </component>
    
    <!-- Fallback for unknown card types -->
    <div v-else class="flex items-center justify-center h-full">
      <div class="text-center text-muted-foreground">
        <svg class="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <span class="text-sm">Unknown card type: {{ card.type }}</span>
      </div>
    </div>
    
    <!-- Resize Handle (for grid integration) -->
    <div 
      v-if="resizable && isSelected"
      class="resize-handle absolute bottom-0 right-0 w-4 h-4 cursor-se-resize"
      :class="resizeHandleClasses"
      @mousedown="handleResizeStart"
    >
      <svg class="w-3 h-3 text-muted-foreground" fill="currentColor" viewBox="0 0 24 24">
        <path d="M22 22H2V2h20v20zM4 4v16h16V4H4z"/>
        <path d="M15 15h-2v2h2v-2zm0-4h-2v2h2v-2zm0-4h-2v2h2v-2z"/>
        <path d="M11 15H9v2h2v-2zm0-4H9v2h2v-2z"/>
        <path d="M7 15H5v2h2v-2z"/>
      </svg>
    </div>
    
    <!-- Selection Indicator -->
    <div 
      v-if="isSelected"
      class="selection-indicator absolute inset-0 pointer-events-none rounded-lg"
      :class="selectionIndicatorClasses"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useCards } from '@/composables/useCards.js';
import { useDashboard } from '@/composables/useDashboard.js';

// Import components directly (not dynamically)
import PublisherCard from './PublisherCard.vue';
import SubscriberCard from './SubscriberCard.vue';
import ChartCard from './ChartCard.vue';
import BaseCard from './BaseCard.vue';

// Component registry
const cardComponents = {
  publisher: PublisherCard,
  subscriber: SubscriberCard,
  chart: ChartCard,
  default: BaseCard
};

// Props
const props = defineProps({
  /**
   * Card configuration object
   */
  card: {
    type: Object,
    required: true
  },
  
  /**
   * Whether the card is selected
   */
  isSelected: {
    type: Boolean,
    default: false
  },
  
  /**
   * Whether the card is draggable
   */
  draggable: {
    type: Boolean,
    default: true
  },
  
  /**
   * Whether the card is resizable
   */
  resizable: {
    type: Boolean,
    default: true
  },
  
  /**
   * Show status text in card header
   */
  showStatusText: {
    type: Boolean,
    default: false
  },
  
  /**
   * Allow title editing
   */
  allowTitleEdit: {
    type: Boolean,
    default: true
  }
});

// Emits
const emit = defineEmits([
  'select',
  'deselect',
  'remove',
  'update',
  'resize-start',
  'resize',
  'resize-end'
]);

// Composables
const { getCardState, updateCard, cleanupCard } = useCards();
const { removeCard } = useDashboard();

// Local state
const isLoading = ref(false);
const loadingText = ref('Loading...');
const resizeStartPos = ref({ x: 0, y: 0 });
const resizeStartSize = ref({ width: 0, height: 0 });
const isLoadingComponent = ref(false);
const componentError = ref(null);
const resolvedComponent = ref(null);

// Computed properties
const cardState = computed(() => getCardState(props.card.id));

const resizeHandleClasses = computed(() => [
  'flex items-center justify-center',
  'bg-background border border-border rounded-tl-md',
  'hover:bg-accent transition-colors',
  'opacity-60 hover:opacity-100'
]);

const selectionIndicatorClasses = computed(() => [
  'border-2 border-primary',
  'bg-primary/5',
  'animate-pulse'
]);

// Component resolution
async function resolveComponent() {
  try {
    isLoadingComponent.value = true;
    componentError.value = null;
    
    const cardType = props.card.type || 'default';
    const component = cardComponents[cardType] || cardComponents.default;
    
    // If it's already a component, use it directly
    if (component && typeof component === 'object') {
      resolvedComponent.value = component;
    } else {
      // If it's a function (dynamic import), await it
      const resolved = await component();
      resolvedComponent.value = resolved.default || resolved;
    }
    
    console.log(`[CardWrapper] Resolved component for type: ${cardType}`);
  } catch (error) {
    console.error(`[CardWrapper] Failed to resolve component for type: ${props.card.type}`, error);
    componentError.value = error;
    resolvedComponent.value = cardComponents.default;
  } finally {
    isLoadingComponent.value = false;
  }
}

// Methods
function handleCardClick(event) {
  if (!props.isSelected) {
    emit('select', props.card.id);
  }
}

function handleActivate() {
  emit('select', props.card.id);
}

function handleTitleUpdate(newTitle) {
  updateCard(props.card.id, { title: newTitle });
  emit('update', { id: props.card.id, title: newTitle });
}

function handleRemove() {
  emit('remove', props.card.id);
}

function handleConfigure() {
  console.log(`[CardWrapper] Configure card: ${props.card.id}`);
}

// Resize handling
function handleResizeStart(event) {
  event.preventDefault();
  event.stopPropagation();
  
  const rect = event.currentTarget.closest('.card-wrapper').getBoundingClientRect();
  
  resizeStartPos.value = {
    x: event.clientX,
    y: event.clientY
  };
  
  resizeStartSize.value = {
    width: rect.width,
    height: rect.height
  };
  
  // Add global mouse event listeners
  document.addEventListener('mousemove', handleResizeMove);
  document.addEventListener('mouseup', handleResizeEnd);
  
  // Prevent text selection during resize
  document.body.style.userSelect = 'none';
  
  emit('resize-start', {
    cardId: props.card.id,
    startPos: resizeStartPos.value,
    startSize: resizeStartSize.value
  });
}

function handleResizeMove(event) {
  const deltaX = event.clientX - resizeStartPos.value.x;
  const deltaY = event.clientY - resizeStartPos.value.y;
  
  const newWidth = Math.max(200, resizeStartSize.value.width + deltaX);
  const newHeight = Math.max(150, resizeStartSize.value.height + deltaY);
  
  emit('resize', {
    cardId: props.card.id,
    width: newWidth,
    height: newHeight,
    deltaX,
    deltaY
  });
}

function handleResizeEnd() {
  // Remove global mouse event listeners
  document.removeEventListener('mousemove', handleResizeMove);
  document.removeEventListener('mouseup', handleResizeEnd);
  
  // Restore text selection
  document.body.style.userSelect = '';
  
  emit('resize-end', {
    cardId: props.card.id
  });
}

// Watch for card type changes
watch(() => props.card.type, () => {
  resolveComponent();
});

// Lifecycle
onMounted(() => {
  console.log(`[CardWrapper] Mounted card wrapper: ${props.card.id}`);
  resolveComponent();
});

onUnmounted(() => {
  console.log(`[CardWrapper] Unmounted card wrapper: ${props.card.id}`);
  
  // Clean up resize event listeners if they exist
  document.removeEventListener('mousemove', handleResizeMove);
  document.removeEventListener('mouseup', handleResizeEnd);
  
  // Restore text selection
  document.body.style.userSelect = '';
});
</script>

<style scoped>
/* Card wrapper positioning */
.card-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

/* Resize handle positioning */
.resize-handle {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 16px;
  height: 16px;
  cursor: se-resize;
  z-index: 10;
}

/* Selection indicator */
.selection-indicator {
  position: absolute;
  top: -2px;
  left: -2px;
  right: -2px;
  bottom: -2px;
  border-radius: 10px;
  pointer-events: none;
}

/* Loading spinner */
.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Pulse animation for selection */
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
</style>

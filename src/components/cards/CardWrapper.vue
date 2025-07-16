<template>
  <div 
    :class="[
      'card-wrapper relative transition-all duration-200',
      'hover:z-10',
      isSelected ? 'z-20' : ''
    ]"
    :data-card-id="card.id"
    @click="handleCardClick"
  >
    <!-- Card Component -->
    <component 
      :is="cardComponent"
      :card-id="card.id"
      :title="card.title"
      :type="card.type"
      :status="cardState?.status || 'idle'"
      :error="cardState?.error"
      :is-loading="isLoading"
      :loading-text="loadingText"
      :is-active="isSelected"
      :draggable="draggable"
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
    
    <!-- Card Configuration Modal -->
    <div 
      v-if="showConfigModal"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      @click.self="closeConfigModal"
    >
      <div class="bg-background border border-border rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden">
        <div class="flex items-center justify-between p-4 border-b border-border">
          <h3 class="text-lg font-semibold">Configure {{ card.title }}</h3>
          <button
            @click="closeConfigModal"
            class="p-1 hover:bg-accent rounded-md transition-colors"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div class="p-4 overflow-y-auto">
          <!-- Configuration content will be provided by specific card types -->
          <slot name="configuration" :card="card" :close="closeConfigModal" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useCards } from '@/composables/useCards.js';
import { useDashboard } from '@/composables/useDashboard.js';

// Dynamic component imports
const cardComponents = {
  publisher: () => import('./PublisherCard.vue'),
  subscriber: () => import('./SubscriberCard.vue'),
  chart: () => import('./ChartCard.vue'),
  default: () => import('./BaseCard.vue')
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
const showConfigModal = ref(false);
const isLoading = ref(false);
const loadingText = ref('Loading...');
const resizeStartPos = ref({ x: 0, y: 0 });
const resizeStartSize = ref({ width: 0, height: 0 });

// Computed properties
const cardState = computed(() => getCardState(props.card.id));

const cardComponent = computed(() => {
  const type = props.card.type || 'default';
  return cardComponents[type] || cardComponents.default;
});

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
  showConfigModal.value = true;
}

function closeConfigModal() {
  showConfigModal.value = false;
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

// Keyboard shortcuts
function handleKeyDown(event) {
  if (!props.isSelected) return;
  
  switch (event.key) {
    case 'Delete':
    case 'Backspace':
      if (event.target.tagName !== 'INPUT' && event.target.tagName !== 'TEXTAREA') {
        event.preventDefault();
        handleRemove();
      }
      break;
      
    case 'Escape':
      if (showConfigModal.value) {
        closeConfigModal();
      } else {
        emit('deselect');
      }
      break;
      
    case 'Enter':
      if (event.ctrlKey || event.metaKey) {
        handleConfigure();
      }
      break;
  }
}

// Lifecycle
onMounted(() => {
  console.log(`[CardWrapper] Mounted card wrapper: ${props.card.id}`);
  
  // Add keyboard event listener
  document.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
  console.log(`[CardWrapper] Unmounted card wrapper: ${props.card.id}`);
  
  // Remove keyboard event listener
  document.removeEventListener('keydown', handleKeyDown);
  
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

.resize-handle::before {
  content: '';
  position: absolute;
  bottom: 0;
  right: 0;
  width: 8px;
  height: 8px;
  background: linear-gradient(
    135deg,
    transparent 0%,
    transparent 40%,
    currentColor 40%,
    currentColor 60%,
    transparent 60%
  );
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

/* Hover effects */
.card-wrapper:hover {
  z-index: 10;
}

.card-wrapper:hover .resize-handle {
  opacity: 1;
}

/* Transitions */
.transition-all {
  transition: all 0.2s ease-in-out;
}

/* Pulse animation for selection */
@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}

.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

/* Modal backdrop */
.fixed.inset-0.bg-black\/50 {
  backdrop-filter: blur(2px);
}

/* Prevent text selection during resize */
.no-select {
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
}
</style>

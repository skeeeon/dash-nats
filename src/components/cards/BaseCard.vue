<template>
  <div 
    :class="[
      'bg-card border border-border rounded-lg shadow-sm transition-all duration-200',
      'hover:shadow-md hover:border-border/80',
      isActive ? 'ring-2 ring-primary/20' : '',
      hasError ? 'border-destructive/50 bg-destructive/5' : ''
    ]"
    :data-card-id="cardId"
  >
    <!-- Card Header -->
    <div 
      class="card-drag-handle flex items-center justify-between p-4 border-b border-border cursor-move"
      :class="{ 'cursor-default': !draggable }"
    >
      <div class="flex items-center gap-3 flex-1 min-w-0">
        <!-- Card Icon -->
        <div class="flex-shrink-0">
          <component 
            :is="cardIcon" 
            :class="[
              'w-5 h-5 transition-colors',
              statusClasses.icon
            ]"
          />
        </div>
        
        <!-- Card Title -->
        <div class="min-w-0 flex-1">
          <h3 
            v-if="!isEditingTitle"
            @dblclick="startTitleEdit"
            class="font-medium text-foreground truncate cursor-pointer hover:text-primary transition-colors"
            :title="title"
          >
            {{ title }}
          </h3>
          
          <input
            v-else
            ref="titleInput"
            v-model="editingTitle"
            @blur="saveTitleEdit"
            @keyup.enter="saveTitleEdit"
            @keyup.escape="cancelTitleEdit"
            class="w-full px-2 py-1 text-sm font-medium bg-background border border-input rounded focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            :placeholder="title"
          />
        </div>
        
        <!-- Card Status -->
        <div class="flex items-center gap-2">
          <div 
            :class="[
              'w-2 h-2 rounded-full transition-all',
              statusClasses.indicator
            ]"
            :title="statusText"
          />
          
          <span 
            v-if="showStatusText"
            class="text-xs font-medium"
            :class="statusClasses.text"
          >
            {{ statusText }}
          </span>
        </div>
      </div>
      
      <!-- Card Actions -->
      <div class="flex items-center gap-1 ml-2">
        <!-- Custom Actions Slot -->
        <slot name="actions" />
        
        <!-- Configure Button -->
        <button
          @click="$emit('configure')"
          class="p-1.5 hover:bg-accent rounded-md transition-colors"
          title="Configure card"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
        
        <!-- Remove Button -->
        <button
          @click="handleRemove"
          class="p-1.5 hover:bg-destructive/10 hover:text-destructive rounded-md transition-colors"
          title="Remove card"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
    
    <!-- Card Content -->
    <div class="p-4">
      <!-- Error State -->
      <div v-if="hasError" class="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
        <div class="flex items-center gap-2 text-destructive">
          <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span class="text-sm font-medium">{{ error }}</span>
        </div>
      </div>
      
      <!-- Loading State -->
      <div v-if="isLoading" class="flex items-center justify-center py-8">
        <div class="flex items-center gap-2 text-muted-foreground">
          <svg class="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span class="text-sm">{{ loadingText }}</span>
        </div>
      </div>
      
      <!-- Card Content Slot -->
      <div v-else>
        <slot />
      </div>
    </div>
    
    <!-- Card Footer -->
    <div v-if="$slots.footer" class="px-4 pb-4 pt-0">
      <div class="pt-3 border-t border-border">
        <slot name="footer" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, onMounted, onUnmounted } from 'vue';

// Props
const props = defineProps({
  /**
   * Unique card identifier
   */
  cardId: {
    type: String,
    required: true
  },
  
  /**
   * Card title
   */
  title: {
    type: String,
    default: 'Card'
  },
  
  /**
   * Card type (publisher, subscriber, etc.)
   */
  type: {
    type: String,
    default: 'default'
  },
  
  /**
   * Card status
   */
  status: {
    type: String,
    default: 'idle',
    validator: (value) => ['idle', 'loading', 'active', 'error', 'disabled'].includes(value)
  },
  
  /**
   * Error message
   */
  error: {
    type: String,
    default: null
  },
  
  /**
   * Loading state
   */
  isLoading: {
    type: Boolean,
    default: false
  },
  
  /**
   * Loading text
   */
  loadingText: {
    type: String,
    default: 'Loading...'
  },
  
  /**
   * Whether the card is active/selected
   */
  isActive: {
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
   * Whether to show status text
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
const emit = defineEmits(['update:title', 'remove', 'configure', 'activate']);

// Local state
const titleInput = ref(null);
const isEditingTitle = ref(false);
const editingTitle = ref('');

// Computed properties
const hasError = computed(() => !!props.error);

const statusText = computed(() => {
  switch (props.status) {
    case 'loading': return 'Loading';
    case 'active': return 'Active';
    case 'error': return 'Error';
    case 'disabled': return 'Disabled';
    default: return 'Ready';
  }
});

const statusClasses = computed(() => {
  switch (props.status) {
    case 'loading':
      return {
        indicator: 'bg-yellow-500 animate-pulse',
        text: 'text-yellow-700 dark:text-yellow-400',
        icon: 'text-yellow-600 dark:text-yellow-400'
      };
    case 'active':
      return {
        indicator: 'bg-green-500',
        text: 'text-green-700 dark:text-green-400',
        icon: 'text-green-600 dark:text-green-400'
      };
    case 'error':
      return {
        indicator: 'bg-red-500',
        text: 'text-red-700 dark:text-red-400',
        icon: 'text-red-600 dark:text-red-400'
      };
    case 'disabled':
      return {
        indicator: 'bg-gray-400',
        text: 'text-gray-700 dark:text-gray-400',
        icon: 'text-gray-600 dark:text-gray-400'
      };
    default:
      return {
        indicator: 'bg-gray-300 dark:bg-gray-600',
        text: 'text-gray-700 dark:text-gray-300',
        icon: 'text-gray-600 dark:text-gray-400'
      };
  }
});

const cardIcon = computed(() => {
  // Return appropriate icon component based on card type
  switch (props.type) {
    case 'publisher':
      return {
        template: `
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
          </svg>
        `
      };
    case 'subscriber':
      return {
        template: `
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                  d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2h4a1 1 0 110 2h-1v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6H3a1 1 0 110-2h4zM9 6V3h6v3H9z"/>
          </svg>
        `
      };
    case 'chart':
      return {
        template: `
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
          </svg>
        `
      };
    default:
      return {
        template: `
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
          </svg>
        `
      };
  }
});

// Methods
function startTitleEdit() {
  if (!props.allowTitleEdit) return;
  
  isEditingTitle.value = true;
  editingTitle.value = props.title;
  
  nextTick(() => {
    titleInput.value?.focus();
    titleInput.value?.select();
  });
}

function saveTitleEdit() {
  if (editingTitle.value.trim() && editingTitle.value !== props.title) {
    emit('update:title', editingTitle.value.trim());
  }
  
  isEditingTitle.value = false;
  editingTitle.value = '';
}

function cancelTitleEdit() {
  isEditingTitle.value = false;
  editingTitle.value = '';
}

function handleRemove() {
  if (confirm(`Are you sure you want to remove "${props.title}"?`)) {
    emit('remove');
  }
}

function handleCardClick() {
  emit('activate');
}

// Lifecycle
onMounted(() => {
  console.log(`[BaseCard] Mounted card: ${props.cardId}`);
});

onUnmounted(() => {
  console.log(`[BaseCard] Unmounted card: ${props.cardId}`);
});
</script>

<style scoped>
/* Card drag handle cursor */
.card-drag-handle {
  cursor: move;
}

.card-drag-handle:hover {
  background-color: hsl(var(--accent) / 0.5);
}

/* Smooth transitions */
.transition-all {
  transition: all 0.2s ease-in-out;
}

/* Status indicator animations */
.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

/* Loading spinner */
.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* Focus styles for accessibility */
button:focus-visible {
  outline: 2px solid hsl(var(--primary));
  outline-offset: 2px;
}

/* Title input focus */
input:focus {
  box-shadow: 0 0 0 2px hsl(var(--primary) / 0.2);
}
</style>

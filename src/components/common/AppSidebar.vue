<template>
  <aside
    :class="[
      'transition-all duration-300 ease-in-out',
      'border-r border-border bg-card',
      'flex flex-col',
      // Desktop styling
      'lg:relative lg:translate-x-0',
      // Mobile styling
      'fixed inset-y-0 left-0 z-50 lg:z-auto',
      // Width based on collapsed state
      isCollapsed ? 'w-0 lg:w-16' : 'w-64',
      // Mobile specific positioning
      'lg:block',
      isCollapsed && isMobile ? '-translate-x-full' : 'translate-x-0'
    ]"
  >
    <!-- Sidebar Content -->
    <div
      :class="[
        'flex flex-col h-full',
        isCollapsed ? 'overflow-hidden' : 'overflow-visible'
      ]"
    >
      <!-- Header -->
      <div class="flex items-center justify-between h-16 px-4 border-b border-border">
        <div class="flex items-center gap-3">
          <!-- Logo -->
          <div class="flex-shrink-0">
            <svg class="w-8 h-8 text-primary" fill="currentColor" viewBox="0 0 24 24">
              <!-- NATS-inspired logo -->
              <path d="M3 3h18v18H3V3zm2 2v14h14V5H5zm2 2h10v2H7V7zm0 4h10v2H7v-2zm0 4h7v2H7v-2z"/>
            </svg>
          </div>
          
          <!-- Title -->
          <transition name="fade">
            <div v-if="!isCollapsed" class="flex flex-col">
              <h2 class="text-lg font-semibold text-foreground">NATS</h2>
              <span class="text-xs text-muted-foreground">Dashboard</span>
            </div>
          </transition>
        </div>
        
        <!-- Desktop collapse toggle -->
        <button
          v-if="!isMobile && !isCollapsed"
          @click="$emit('toggle')"
          class="p-1.5 hover:bg-accent rounded-md transition-colors"
          :title="isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'"
        >
          <svg 
            class="w-4 h-4 transition-transform duration-200"
            :class="{ 'rotate-180': isCollapsed }"
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      </div>
      
      <!-- Navigation Menu -->
      <nav class="flex-1 p-4 space-y-2">
        <!-- Collapse toggle for collapsed state -->
        <div v-if="isCollapsed && !isMobile" class="flex justify-center mb-4">
          <button
            @click="$emit('toggle')"
            class="p-2 hover:bg-accent rounded-md transition-colors"
            title="Expand sidebar"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
        
        <!-- Dashboard Link -->
        <SidebarItem
          :to="{ name: 'dashboard' }"
          :icon="DashboardIcon"
          :label="'Dashboard'"
          :collapsed="isCollapsed"
          @click="handleNavigate({ name: 'dashboard' })"
        />
        
        <!-- Dashboards Section -->
        <div class="py-2" v-if="dashboards.length > 0">
          <SidebarSection
            :title="'Dashboards'"
            :collapsed="isCollapsed"
          />
          
          <div class="space-y-1 mt-2">
            <SidebarItem
              v-for="dashboard in dashboards"
              :key="dashboard.id"
              :icon="DashboardIcon"
              :label="dashboard.name"
              :collapsed="isCollapsed"
              @click="handleNavigate({ name: 'dashboard', params: { id: dashboard.id } })"
            />
          </div>
        </div>
      </nav>
      
      <!-- Footer -->
      <div class="p-4 border-t border-border">
        <!-- Connection Status Summary (when not collapsed and connected) -->
        <div v-if="!isCollapsed && connectionStats && connectionStatus === 'connected' && (connectionStats.totalMessages > 0 || connectionStats.subscriptionsCount > 0)" class="mb-3">
          <div class="text-xs text-muted-foreground mb-2">Activity</div>
          <div class="text-xs text-muted-foreground space-y-1">
            <div v-if="connectionStats.totalMessages > 0">Messages: {{ connectionStats.totalMessages }}</div>
            <div v-if="connectionStats.subscriptionsCount > 0">Subscriptions: {{ connectionStats.subscriptionsCount }}</div>
          </div>
        </div>
        
        <!-- About/Help Links -->
        <div class="space-y-1">
          <SidebarItem
            :to="{ name: 'about' }"
            :icon="InfoIcon"
            :label="'About'"
            :collapsed="isCollapsed"
            @click="handleNavigate({ name: 'about' })"
          />
        </div>
      </div>
    </div>
  </aside>
</template>

<script setup>
import { computed, defineAsyncComponent } from 'vue';
import { useRoute } from 'vue-router';
import { useNatsConnection } from '@/composables/useNatsConnection.js';

// Props
const props = defineProps({
  isCollapsed: {
    type: [Boolean, null],
    default: null
  }
});

// Emits
const emit = defineEmits(['toggle', 'navigate']);

// Composables
const route = useRoute();
const { 
  connectionStatus, 
  connectionStats
} = useNatsConnection();

// Computed properties
const isMobile = computed(() => window.innerWidth < 1024);
const isCollapsed = computed(() => {
  if (props.isCollapsed === null) {
    return false; // Auto mode - expanded by default
  }
  return props.isCollapsed;
});

// Mock dashboards - will be replaced with actual dashboard store
const dashboards = computed(() => [
  { id: 'default', name: 'Main Dashboard' }
]);

// Methods
function handleNavigate(routeInfo) {
  emit('navigate', routeInfo);
}

// Icon components (simple SVG icons)
const DashboardIcon = {
  template: `
    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
            d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
    </svg>
  `
};

const ConnectionIcon = {
  template: `
    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
            d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
    </svg>
  `
};

const SettingsIcon = {
  template: `
    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  `
};

const InfoIcon = {
  template: `
    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  `
};
</script>

<!-- Sidebar Components -->
<script>
// SidebarItem component
const SidebarItem = {
  props: {
    to: Object,
    icon: Object,
    label: String,
    collapsed: Boolean,
    status: String
  },
  emits: ['click'],
  template: `
    <div
      @click="$emit('click')"
      :class="[
        'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
        'hover:bg-accent hover:text-accent-foreground',
        'cursor-pointer group',
        collapsed ? 'justify-center' : 'justify-start'
      ]"
    >
      <component 
        :is="icon" 
        :class="[
          'flex-shrink-0',
          status === 'connected' ? 'text-green-600' :
          status === 'connecting' ? 'text-yellow-600' :
          status === 'error' ? 'text-red-600' : ''
        ]"
      />
      
      <transition name="fade">
        <span v-if="!collapsed" class="text-sm font-medium truncate">
          {{ label }}
        </span>
      </transition>
      
      <!-- Tooltip for collapsed state -->
      <div 
        v-if="collapsed"
        class="absolute left-full ml-2 px-2 py-1 bg-popover text-popover-foreground text-sm rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 whitespace-nowrap"
      >
        {{ label }}
      </div>
    </div>
  `
};

// SidebarSection component
const SidebarSection = {
  props: {
    title: String,
    collapsed: Boolean
  },
  template: `
    <div v-if="!collapsed" class="px-3 mb-2">
      <h3 class="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        {{ title }}
      </h3>
    </div>
  `
};

export default {
  components: {
    SidebarItem,
    SidebarSection
  }
};
</script>

<style scoped>
/* Fade transition for text elements */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Tooltip positioning */
.group:hover .absolute {
  z-index: 9999;
}
</style>

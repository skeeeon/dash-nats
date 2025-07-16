<template>
  <div class="min-h-screen bg-background flex">
    <!-- Sidebar -->
    <AppSidebar 
      :is-collapsed="sidebarCollapsed"
      @toggle="toggleSidebar"
      @navigate="handleNavigation"
    />
    
    <!-- Main Content Area -->
    <div class="flex-1 flex flex-col">
      <!-- Top Bar -->
      <header class="h-16 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div class="flex items-center justify-between h-full px-4">
          <!-- Left side - sidebar toggle for mobile -->
          <div class="flex items-center gap-4">
            <button
              @click="toggleSidebar"
              class="lg:hidden p-2 hover:bg-accent rounded-md transition-colors"
              aria-label="Toggle sidebar"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            
            <!-- Page title -->
            <h1 class="text-xl font-semibold text-foreground">
              {{ pageTitle }}
            </h1>
          </div>
          
          <!-- Right side - connection button and theme toggle -->
          <div class="flex items-center gap-3">
            <!-- Connection Button -->
            <button
              @click="router.push({ name: 'connections' })"
              :class="[
                'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200',
                isOnline && isConnected 
                  ? 'bg-green-100 text-green-700 hover:bg-green-200 border border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50 dark:border-green-800'
                  : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200 border border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-400 dark:hover:bg-yellow-900/50 dark:border-yellow-800 animate-pulse'
              ]"
              :title="isConnected ? 'Connection Settings' : 'Connect to NATS'"
            >
              <div 
                :class="[
                  'w-2 h-2 rounded-full',
                  isConnected ? 'bg-green-500' : 'bg-yellow-500'
                ]"
              />
              <span class="hidden sm:inline">
                {{ isConnected ? 'Connected' : 'Not Connected' }}
              </span>
              <span class="sm:hidden">
                {{ isConnected ? '✓' : '!' }}
              </span>
            </button>
            
            <ThemeToggle />
          </div>
        </div>
      </header>
      
      <!-- Offline Banner -->
      <OfflineBanner v-if="!isOnline" />
      
      <!-- Main Content -->
      <main class="flex-1 overflow-hidden">
        <div class="h-full">
          <slot />
        </div>
      </main>
      
      <!-- Toast Container -->
      <ToastContainer />
    </div>
    
    <!-- Mobile Sidebar Overlay -->
    <div
      v-if="sidebarCollapsed === false && isMobile"
      class="fixed inset-0 bg-black/50 z-40 lg:hidden"
      @click="closeSidebar"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useNatsConnection } from '@/composables/useNatsConnection.js';
import AppSidebar from './AppSidebar.vue';
import OfflineBanner from '../connection/OfflineBanner.vue';
import ThemeToggle from './ThemeToggle.vue';
import ToastContainer from './ToastContainer.vue';

// Props
const props = defineProps({
  /**
   * Override the automatic page title detection
   */
  title: {
    type: String,
    default: null
  }
});

// Composables
const route = useRoute();
const router = useRouter();
const { isOnline, isConnected } = useNatsConnection();

// Local state
const sidebarCollapsed = ref(null); // null = auto, true = collapsed, false = expanded
const isMobile = ref(false);

// Computed properties
const pageTitle = computed(() => {
  if (props.title) {
    return props.title;
  }
  
  // Generate title from route
  if (route.meta?.title) {
    return route.meta.title;
  }
  
  // Fallback to route name or path
  const routeName = route.name || route.path.slice(1);
  return routeName
    ? routeName.charAt(0).toUpperCase() + routeName.slice(1)
    : 'NATS Dashboard';
});

// Methods
function toggleSidebar() {
  if (isMobile.value) {
    // On mobile, always toggle between hidden and visible
    sidebarCollapsed.value = !sidebarCollapsed.value;
  } else {
    // On desktop, toggle between collapsed and expanded
    sidebarCollapsed.value = sidebarCollapsed.value !== true;
  }
}

function closeSidebar() {
  if (isMobile.value) {
    sidebarCollapsed.value = true;
  }
}

function handleNavigation(route) {
  router.push(route);
  
  // Close sidebar on mobile after navigation
  if (isMobile.value) {
    closeSidebar();
  }
}

function handleResize() {
  const mobile = window.innerWidth < 1024; // lg breakpoint
  
  if (mobile !== isMobile.value) {
    isMobile.value = mobile;
    
    // Reset sidebar state when switching between mobile/desktop
    if (mobile) {
      sidebarCollapsed.value = true; // Hidden by default on mobile
    } else {
      sidebarCollapsed.value = null; // Auto on desktop
    }
  }
}

function handleKeydown(event) {
  // Keyboard shortcuts
  if (event.metaKey || event.ctrlKey) {
    switch (event.key) {
      case 'b':
        // Ctrl/Cmd + B: Toggle sidebar
        event.preventDefault();
        toggleSidebar();
        break;
    }
  }
  
  // Escape key handling
  if (event.key === 'Escape' && isMobile.value && !sidebarCollapsed.value) {
    closeSidebar();
  }
}

// Lifecycle
onMounted(() => {
  // Initial mobile detection
  handleResize();
  
  // Setup event listeners
  window.addEventListener('resize', handleResize);
  document.addEventListener('keydown', handleKeydown);
  
  // Setup initial sidebar state
  if (isMobile.value) {
    sidebarCollapsed.value = true;
  }
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
  document.removeEventListener('keydown', handleKeydown);
});
</script>

<style scoped>
/* Custom scrollbar for main content */
main::-webkit-scrollbar {
  width: 6px;
}

main::-webkit-scrollbar-track {
  @apply bg-background;
}

main::-webkit-scrollbar-thumb {
  @apply bg-border rounded-full;
}

main::-webkit-scrollbar-thumb:hover {
  @apply bg-border/80;
}

/* Animation for mobile sidebar overlay */
@media (max-width: 1023px) {
  .fixed.inset-0.bg-black\/50 {
    animation: fadeIn 0.2s ease-out;
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 0.5;
  }
}
</style>

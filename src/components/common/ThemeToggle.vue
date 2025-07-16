<template>
  <button
    @click="toggleTheme"
    :class="[
      'p-2 rounded-md transition-all duration-200',
      'hover:bg-accent hover:text-accent-foreground',
      'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary',
      'text-muted-foreground hover:text-foreground'
    ]"
    :title="`Switch to ${isDark ? 'light' : 'dark'} mode`"
    :aria-label="`Switch to ${isDark ? 'light' : 'dark'} mode`"
  >
    <!-- Sun Icon (Light Mode) -->
    <transition name="fade" mode="out-in">
      <svg
        v-if="isDark"
        key="sun"
        class="w-5 h-5 transition-transform duration-200 hover:scale-110"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
        />
      </svg>
      
      <!-- Moon Icon (Dark Mode) -->
      <svg
        v-else
        key="moon"
        class="w-5 h-5 transition-transform duration-200 hover:scale-110"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
        />
      </svg>
    </transition>
  </button>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import storageService from '@/services/StorageService.js';

// Emits
const emit = defineEmits(['theme-changed']);

// Local state
const currentTheme = ref('light');

// Computed properties
const isDark = computed(() => currentTheme.value === 'dark');

// Methods
function toggleTheme() {
  const newTheme = isDark.value ? 'light' : 'dark';
  setTheme(newTheme);
}

function setTheme(theme) {
  if (!['light', 'dark'].includes(theme)) {
    console.warn(`Invalid theme: ${theme}. Using 'light' as fallback.`);
    theme = 'light';
  }

  currentTheme.value = theme;
  
  // Apply theme to document
  applyThemeToDocument(theme);
  
  // Save to storage
  saveThemePreference(theme);
  
  // Emit event
  emit('theme-changed', theme);
}

function applyThemeToDocument(theme) {
  const root = document.documentElement;
  
  if (theme === 'dark') {
    root.classList.add('dark');
    root.classList.remove('light');
  } else {
    root.classList.add('light');
    root.classList.remove('dark');
  }
  
  // Update meta theme-color for mobile browsers
  updateMetaThemeColor(theme);
}

function updateMetaThemeColor(theme) {
  let metaThemeColor = document.querySelector('meta[name="theme-color"]');
  
  if (!metaThemeColor) {
    metaThemeColor = document.createElement('meta');
    metaThemeColor.name = 'theme-color';
    document.head.appendChild(metaThemeColor);
  }
  
  // Set theme color based on current theme
  const colors = {
    light: '#ffffff',
    dark: '#0f172a'
  };
  
  metaThemeColor.content = colors[theme];
}

function saveThemePreference(theme) {
  try {
    storageService.updateUserPreference('theme', theme);
  } catch (error) {
    console.error('Failed to save theme preference:', error);
  }
}

function loadThemePreference() {
  try {
    const preferences = storageService.getUserPreferences();
    return preferences.theme || getSystemTheme();
  } catch (error) {
    console.error('Failed to load theme preference:', error);
    return getSystemTheme();
  }
}

function getSystemTheme() {
  // Check system preference
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
}

function handleSystemThemeChange(event) {
  // Only auto-switch if user hasn't manually set a preference
  const preferences = storageService.getUserPreferences();
  
  if (!preferences.theme) {
    const systemTheme = event.matches ? 'dark' : 'light';
    setTheme(systemTheme);
  }
}

// Initialize theme system
function initializeTheme() {
  // Load saved preference or detect system theme
  const initialTheme = loadThemePreference();
  setTheme(initialTheme);
  
  // Listen for system theme changes
  if (window.matchMedia) {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', handleSystemThemeChange);
    
    // Cleanup listener when component unmounts
    const cleanup = () => {
      mediaQuery.removeEventListener('change', handleSystemThemeChange);
    };
    
    return cleanup;
  }
  
  return () => {};
}

// Watchers
watch(currentTheme, (newTheme) => {
  console.log(`Theme changed to: ${newTheme}`);
});

// Lifecycle
let cleanupThemeListener;

onMounted(() => {
  cleanupThemeListener = initializeTheme();
});

// Cleanup
onUnmounted(() => {
  if (cleanupThemeListener) {
    cleanupThemeListener();
  }
});

// Expose methods for external use
defineExpose({
  setTheme,
  toggleTheme,
  currentTheme: computed(() => currentTheme.value),
  isDark
});
</script>

<style scoped>
/* Fade transition for icon switching */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Hover effects */
button:hover svg {
  filter: drop-shadow(0 0 4px currentColor);
}

/* Focus styles for accessibility */
button:focus-visible {
  outline: 2px solid hsl(var(--primary));
  outline-offset: 2px;
}
</style>

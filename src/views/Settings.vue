<template>
  <div class="h-full overflow-auto">
    <div class="max-w-3xl mx-auto p-6">
      <!-- Page Header -->
      <div class="mb-8">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-3xl font-bold text-foreground">Settings</h1>
            <p class="text-muted-foreground mt-2">
              Customize your dashboard preferences and application settings.
            </p>
          </div>
          <button
            @click="router.push({ name: 'dashboard' })"
            class="px-4 py-2 text-sm bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-md transition-colors"
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>

      <div class="space-y-8">
        <!-- Appearance Settings -->
        <div class="bg-card border border-border rounded-lg">
          <div class="p-4 border-b border-border">
            <h2 class="text-xl font-semibold text-foreground">Appearance</h2>
            <p class="text-muted-foreground text-sm mt-1">
              Customize the look and feel of your dashboard.
            </p>
          </div>
          
          <div class="p-6 space-y-6">
            <!-- Theme Selection -->
            <div class="flex items-center justify-between">
              <div>
                <h3 class="font-medium text-foreground">Theme</h3>
                <p class="text-sm text-muted-foreground">Choose your preferred color scheme</p>
              </div>
              <div class="flex items-center gap-2">
                <button
                  @click="setTheme('light')"
                  :class="[
                    'px-3 py-2 text-sm rounded-md transition-colors',
                    preferences.theme === 'light' 
                      ? 'bg-primary text-primary-foreground' 
                      : 'border border-input hover:bg-accent'
                  ]"
                >
                  Light
                </button>
                <button
                  @click="setTheme('dark')"
                  :class="[
                    'px-3 py-2 text-sm rounded-md transition-colors',
                    preferences.theme === 'dark' 
                      ? 'bg-primary text-primary-foreground' 
                      : 'border border-input hover:bg-accent'
                  ]"
                >
                  Dark
                </button>
                <button
                  @click="setTheme('system')"
                  :class="[
                    'px-3 py-2 text-sm rounded-md transition-colors',
                    preferences.theme === 'system' 
                      ? 'bg-primary text-primary-foreground' 
                      : 'border border-input hover:bg-accent'
                  ]"
                >
                  System
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Dashboard Settings -->
        <div class="bg-card border border-border rounded-lg">
          <div class="p-4 border-b border-border">
            <h2 class="text-xl font-semibold text-foreground">Dashboard</h2>
            <p class="text-muted-foreground text-sm mt-1">
              Configure dashboard behavior and grid settings.
            </p>
          </div>
          
          <div class="p-6 space-y-6">
            <!-- Grid Settings -->
            <div>
              <h3 class="font-medium text-foreground mb-4">Grid Settings</h3>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label for="cellHeight" class="block text-sm font-medium text-foreground mb-2">
                    Cell Height (px)
                  </label>
                  <input
                    id="cellHeight"
                    v-model.number="preferences.gridOptions.cellHeight"
                    type="number"
                    min="50"
                    max="200"
                    step="10"
                    @change="updateGridOptions"
                    class="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label for="margin" class="block text-sm font-medium text-foreground mb-2">
                    Margin (px)
                  </label>
                  <input
                    id="margin"
                    v-model.number="preferences.gridOptions.margin"
                    type="number"
                    min="0"
                    max="20"
                    @change="updateGridOptions"
                    class="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
              </div>
            </div>
            
            <!-- Animation Settings -->
            <div class="flex items-center justify-between">
              <div>
                <h3 class="font-medium text-foreground">Enable Animations</h3>
                <p class="text-sm text-muted-foreground">Show smooth animations when moving cards</p>
              </div>
              <label class="relative inline-flex items-center cursor-pointer">
                <input
                  v-model="preferences.gridOptions.animate"
                  type="checkbox"
                  @change="updateGridOptions"
                  class="sr-only peer"
                />
                <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/30 dark:peer-focus:ring-primary/50 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
              </label>
            </div>
          </div>
        </div>

        <!-- Notification Settings -->
        <div class="bg-card border border-border rounded-lg">
          <div class="p-4 border-b border-border">
            <h2 class="text-xl font-semibold text-foreground">Notifications</h2>
            <p class="text-muted-foreground text-sm mt-1">
              Control which notifications you receive.
            </p>
          </div>
          
          <div class="p-6 space-y-4">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="font-medium text-foreground">Connection Events</h3>
                <p class="text-sm text-muted-foreground">Show notifications for connection changes</p>
              </div>
              <label class="relative inline-flex items-center cursor-pointer">
                <input
                  v-model="preferences.notifications.connection"
                  type="checkbox"
                  @change="updateNotificationSettings"
                  class="sr-only peer"
                />
                <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/30 dark:peer-focus:ring-primary/50 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
              </label>
            </div>
            
            <div class="flex items-center justify-between">
              <div>
                <h3 class="font-medium text-foreground">Error Messages</h3>
                <p class="text-sm text-muted-foreground">Show notifications for errors</p>
              </div>
              <label class="relative inline-flex items-center cursor-pointer">
                <input
                  v-model="preferences.notifications.errors"
                  type="checkbox"
                  @change="updateNotificationSettings"
                  class="sr-only peer"
                />
                <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/30 dark:peer-focus:ring-primary/50 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
              </label>
            </div>
            
            <div class="flex items-center justify-between">
              <div>
                <h3 class="font-medium text-foreground">Success Messages</h3>
                <p class="text-sm text-muted-foreground">Show notifications for successful actions</p>
              </div>
              <label class="relative inline-flex items-center cursor-pointer">
                <input
                  v-model="preferences.notifications.success"
                  type="checkbox"
                  @change="updateNotificationSettings"
                  class="sr-only peer"
                />
                <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/30 dark:peer-focus:ring-primary/50 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
              </label>
            </div>
          </div>
        </div>

        <!-- Data Management -->
        <div class="bg-card border border-border rounded-lg">
          <div class="p-4 border-b border-border">
            <h2 class="text-xl font-semibold text-foreground">Data Management</h2>
            <p class="text-muted-foreground text-sm mt-1">
              Manage your stored data and configurations.
            </p>
          </div>
          
          <div class="p-6 space-y-6">
            <!-- Storage Info -->
            <div>
              <h3 class="font-medium text-foreground mb-3">Storage Usage</h3>
              <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div class="p-3 bg-secondary/50 rounded-lg">
                  <div class="text-muted-foreground">Total Items</div>
                  <div class="text-lg font-semibold">{{ storageInfo.totalItems }}</div>
                </div>
                <div class="p-3 bg-secondary/50 rounded-lg">
                  <div class="text-muted-foreground">Data Size</div>
                  <div class="text-lg font-semibold">{{ formatStorageSize(storageInfo.totalSize) }}</div>
                </div>
                <div class="p-3 bg-secondary/50 rounded-lg">
                  <div class="text-muted-foreground">Status</div>
                  <div class="text-lg font-semibold">{{ storageInfo.isSupported ? 'Available' : 'Limited' }}</div>
                </div>
              </div>
            </div>
            
            <!-- Export/Import -->
            <div>
              <h3 class="font-medium text-foreground mb-3">Export & Import</h3>
              <div class="flex flex-wrap gap-3">
                <button
                  @click="exportSettings"
                  class="px-4 py-2 border border-input hover:bg-accent rounded-md transition-colors"
                >
                  Export Settings
                </button>
                <button
                  @click="importSettings"
                  class="px-4 py-2 border border-input hover:bg-accent rounded-md transition-colors"
                >
                  Import Settings
                </button>
              </div>
            </div>
            
            <!-- Clear Data -->
            <div>
              <h3 class="font-medium text-foreground mb-3">Clear Data</h3>
              <div class="space-y-3">
                <button
                  @click="clearDashboards"
                  class="w-full md:w-auto px-4 py-2 text-left border border-orange-200 text-orange-700 hover:bg-orange-50 dark:border-orange-800 dark:text-orange-400 dark:hover:bg-orange-900/20 rounded-md transition-colors"
                >
                  Clear Dashboard Configurations
                </button>
                <button
                  @click="clearAllData"
                  class="w-full md:w-auto px-4 py-2 text-left border border-red-200 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20 rounded-md transition-colors"
                >
                  Clear All Data
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import storageService from '@/services/StorageService.js';
import { useToast } from '@/composables/useToast.js';

// Composables
const router = useRouter();
const { success, error, info } = useToast();

// Local state
const preferences = ref({
  theme: 'light',
  gridOptions: {
    cellHeight: 100,
    margin: 5,
    animate: true
  },
  notifications: {
    connection: true,
    errors: true,
    success: true
  }
});

const storageInfo = ref({
  totalItems: 0,
  totalSize: 0,
  isSupported: true
});

// Methods
function setTheme(theme) {
  preferences.value.theme = theme;
  savePreferences();
  
  // Apply theme change
  applyTheme(theme);
}

function applyTheme(theme) {
  const root = document.documentElement;
  
  if (theme === 'system') {
    // Use system preference
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    theme = systemDark ? 'dark' : 'light';
  }
  
  if (theme === 'dark') {
    root.classList.add('dark');
    root.classList.remove('light');
  } else {
    root.classList.add('light');
    root.classList.remove('dark');
  }
}

function updateGridOptions() {
  savePreferences();
  console.log('Grid options updated:', preferences.value.gridOptions);
}

function updateNotificationSettings() {
  savePreferences();
  console.log('Notification settings updated:', preferences.value.notifications);
}

function savePreferences() {
  storageService.setUserPreferences(preferences.value);
}

function loadPreferences() {
  const stored = storageService.getUserPreferences();
  preferences.value = { ...preferences.value, ...stored };
  applyTheme(preferences.value.theme);
}

function loadStorageInfo() {
  storageInfo.value = storageService.getStorageInfo();
}

function formatStorageSize(bytes) {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function exportSettings() {
  try {
    const config = storageService.exportConfig();
    if (!config) {
      error('No data to export');
      return;
    }
    
    const dataStr = JSON.stringify(config, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `nats-dashboard-config-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    success('Settings exported successfully');
  } catch (err) {
    console.error('Export failed:', err);
    error('Failed to export settings');
  }
}

function importSettings() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  
  input.onchange = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const config = JSON.parse(e.target.result);
        const result = storageService.importConfig(config);
        
        if (result) {
          success('Settings imported successfully. Refresh the page to see changes.');
          loadPreferences();
          loadStorageInfo();
        } else {
          error('Failed to import settings');
        }
      } catch (err) {
        console.error('Import failed:', err);
        error('Invalid configuration file');
      }
    };
    reader.readAsText(file);
  };
  
  input.click();
}

function clearDashboards() {
  if (confirm('Are you sure you want to clear all dashboard configurations? This cannot be undone.')) {
    storageService.removeItem(storageService.KEYS.DASHBOARD_CONFIG);
    storageService.removeItem(storageService.KEYS.CARD_CONFIGS);
    loadStorageInfo();
    success('Dashboard configurations cleared');
  }
}

function clearAllData() {
  if (confirm('Are you sure you want to clear ALL data? This will remove all settings, connections, and dashboards. This cannot be undone.')) {
    storageService.clearAll();
    loadStorageInfo();
    info('All data cleared. The page will refresh.');
    
    // Refresh page after clearing data
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  }
}

// Lifecycle
onMounted(() => {
  loadPreferences();
  loadStorageInfo();
  
  // Listen for system theme changes
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const handleSystemThemeChange = () => {
    if (preferences.value.theme === 'system') {
      applyTheme('system');
    }
  };
  
  mediaQuery.addEventListener('change', handleSystemThemeChange);
  
  // Cleanup
  onUnmounted(() => {
    mediaQuery.removeEventListener('change', handleSystemThemeChange);
  });
});
</script>

<style scoped>
/* Custom toggle switch styles are handled by Tailwind classes */
</style>

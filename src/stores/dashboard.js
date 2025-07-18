import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import storageService from '@/services/StorageService.js';

/**
 * Pinia store for managing dashboard state and configuration
 * Handles dashboard persistence, grid settings, and layout management
 */
export const useDashboardStore = defineStore('dashboard', () => {
  // State
  const dashboards = ref(new Map());
  const activeDashboardId = ref('default');
  const isGridLoaded = ref(false);
  
  // Grid settings
  const gridSettings = ref({
    cellHeight: 100,
    margin: 5,
    animate: true,
    float: false,
    column: 12,
    maxRow: 0, // Unlimited rows
    resizable: {
      handles: 'e, se, s, sw, w'
    },
    draggable: {
      handle: '.card-drag-handle'
    }
  });

  // Computed properties
  const activeDashboard = computed(() => {
    return dashboards.value.get(activeDashboardId.value) || createDefaultDashboard();
  });

  const hasCards = computed(() => {
    return activeDashboard.value.cards.length > 0;
  });

  const gridOptions = computed(() => {
    // Load user preferences for grid settings
    const userPrefs = storageService.getUserPreferences();
    return {
      ...gridSettings.value,
      ...userPrefs.gridOptions
    };
  });

  // Actions

  /**
   * Initialize dashboard store
   * Loads saved dashboards and sets up default dashboard
   */
  function initialize() {
    console.log('[DashboardStore] Initializing dashboard store');
    
    // Load saved dashboards
    loadDashboards();
    
    // Ensure default dashboard exists
    if (!dashboards.value.has('default')) {
      createDashboard('default', 'Main Dashboard');
    }
    
    // Set active dashboard
    const savedActive = storageService.getItem('active_dashboard_id');
    if (savedActive && dashboards.value.has(savedActive)) {
      activeDashboardId.value = savedActive;
    }
    
    console.log('[DashboardStore] Dashboard store initialized');
  }

  /**
   * Create a new dashboard
   * @param {string} id - Dashboard ID
   * @param {string} name - Dashboard name
   * @returns {Object} Created dashboard
   */
  function createDashboard(id, name) {
    const dashboard = {
      id,
      name,
      cards: [],
      gridLayout: [],
      settings: {
        theme: 'inherit',
        gridOptions: { ...gridSettings.value }
      },
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    dashboards.value.set(id, dashboard);
    saveDashboards();
    
    console.log(`[DashboardStore] Created dashboard: ${name} (${id})`);
    return dashboard;
  }

  /**
   * Delete a dashboard
   * @param {string} id - Dashboard ID to delete
   */
  function deleteDashboard(id) {
    if (id === 'default') {
      console.warn('[DashboardStore] Cannot delete default dashboard');
      return false;
    }
    
    if (dashboards.value.has(id)) {
      dashboards.value.delete(id);
      
      // If deleting active dashboard, switch to default
      if (activeDashboardId.value === id) {
        activeDashboardId.value = 'default';
      }
      
      saveDashboards();
      console.log(`[DashboardStore] Deleted dashboard: ${id}`);
      return true;
    }
    
    return false;
  }

  /**
   * Switch to a different dashboard
   * @param {string} id - Dashboard ID to switch to
   */
  function switchDashboard(id) {
    if (dashboards.value.has(id)) {
      activeDashboardId.value = id;
      storageService.setItem('active_dashboard_id', id);
      console.log(`[DashboardStore] Switched to dashboard: ${id}`);
    }
  }

  /**
   * Update dashboard metadata
   * @param {string} id - Dashboard ID
   * @param {Object} updates - Updates to apply
   */
  function updateDashboard(id, updates) {
    const dashboard = dashboards.value.get(id);
    if (!dashboard) return false;
    
    Object.assign(dashboard, updates, { updatedAt: Date.now() });
    saveDashboards();
    
    console.log(`[DashboardStore] Updated dashboard: ${id}`);
    return true;
  }

  /**
   * Add a card to the active dashboard
   * @param {Object} card - Card configuration
   */
  function addCard(card) {
    const dashboard = activeDashboard.value;
    const cardWithId = {
      ...card,
      id: card.id || generateCardId(),
      dashboardId: dashboard.id,
      createdAt: Date.now()
    };
    
    dashboard.cards.push(cardWithId);
    dashboard.updatedAt = Date.now();
    
    // Add default layout if not exists
    if (!dashboard.gridLayout.find(item => item.id === cardWithId.id)) {
      const defaultLayout = generateDefaultLayout(cardWithId);
      dashboard.gridLayout.push(defaultLayout);
    }
    
    saveDashboards();
    console.log(`[DashboardStore] Added card: ${cardWithId.id}`);
    
    return cardWithId;
  }

  /**
   * Remove a card from the active dashboard
   * @param {string} cardId - Card ID to remove
   */
  function removeCard(cardId) {
    const dashboard = activeDashboard.value;
    const cardIndex = dashboard.cards.findIndex(card => card.id === cardId);
    
    if (cardIndex > -1) {
      dashboard.cards.splice(cardIndex, 1);
      dashboard.updatedAt = Date.now();
      
      // Also remove from grid layout
      const layoutIndex = dashboard.gridLayout.findIndex(item => item.id === cardId);
      if (layoutIndex > -1) {
        dashboard.gridLayout.splice(layoutIndex, 1);
      }
      
      saveDashboards();
      console.log(`[DashboardStore] Removed card: ${cardId}`);
      return true;
    }
    
    return false;
  }

  /**
   * Update card configuration
   * @param {string} cardId - Card ID
   * @param {Object} updates - Updates to apply
   */
  function updateCard(cardId, updates) {
    const dashboard = activeDashboard.value;
    const card = dashboard.cards.find(c => c.id === cardId);
    
    if (card) {
      Object.assign(card, updates, { updatedAt: Date.now() });
      dashboard.updatedAt = Date.now();
      
      saveDashboards();
      console.log(`[DashboardStore] Updated card: ${cardId}`);
      return true;
    }
    
    return false;
  }

  /**
   * Update grid layout positions
   * @param {Array} layout - Grid layout items
   */
  function updateGridLayout(layout) {
    const dashboard = activeDashboard.value;
    
    // Ensure layout is valid
    if (!Array.isArray(layout)) {
      console.warn('[DashboardStore] Invalid layout provided');
      return;
    }
    
    dashboard.gridLayout = layout.map(item => ({
      id: item.id,
      x: item.x || 0,
      y: item.y || 0,
      w: item.w || 4,
      h: item.h || 3
    }));
    
    dashboard.updatedAt = Date.now();
    saveDashboards();
    
    console.log(`[DashboardStore] Updated grid layout with ${layout.length} items`);
  }

  /**
   * Get card by ID
   * @param {string} cardId - Card ID
   * @returns {Object|null} Card or null if not found
   */
  function getCard(cardId) {
    return activeDashboard.value.cards.find(card => card.id === cardId) || null;
  }

  /**
   * Get grid layout for a card
   * @param {string} cardId - Card ID
   * @returns {Object|null} Grid layout item or null
   */
  function getCardLayout(cardId) {
    return activeDashboard.value.gridLayout.find(item => item.id === cardId) || null;
  }

  /**
   * Mark grid as loaded
   * @param {boolean} loaded - Load state
   */
  function setGridLoaded(loaded) {
    isGridLoaded.value = loaded;
  }

  /**
   * Export dashboard configuration
   * @param {string} id - Dashboard ID to export
   * @returns {Object} Exportable dashboard configuration
   */
  function exportDashboard(id) {
    const dashboard = dashboards.value.get(id);
    if (!dashboard) return null;
    
    return {
      ...dashboard,
      exportedAt: Date.now(),
      version: '1.0.0'
    };
  }

  /**
   * Import dashboard configuration
   * @param {Object} config - Dashboard configuration to import
   * @returns {boolean} Success status
   */
  function importDashboard(config) {
    if (!config || !config.id || !config.name) {
      console.error('[DashboardStore] Invalid dashboard configuration');
      return false;
    }
    
    // Generate new ID if dashboard already exists
    let importId = config.id;
    if (dashboards.value.has(importId)) {
      importId = `${config.id}_imported_${Date.now()}`;
    }
    
    const dashboard = {
      ...config,
      id: importId,
      importedAt: Date.now(),
      updatedAt: Date.now()
    };
    
    dashboards.value.set(importId, dashboard);
    saveDashboards();
    
    console.log(`[DashboardStore] Imported dashboard: ${dashboard.name} (${importId})`);
    return true;
  }

  // Private helper functions

  /**
   * Load dashboards from storage
   */
  function loadDashboards() {
    const stored = storageService.getItem('dashboards', {});
    
    // Convert stored object to Map
    Object.entries(stored).forEach(([id, dashboard]) => {
      dashboards.value.set(id, dashboard);
    });
    
    console.log(`[DashboardStore] Loaded ${dashboards.value.size} dashboards`);
  }

  /**
   * Save dashboards to storage
   */
  function saveDashboards() {
    // Convert Map to object for storage
    const dashboardsObj = {};
    dashboards.value.forEach((dashboard, id) => {
      dashboardsObj[id] = dashboard;
    });
    
    storageService.setItem('dashboards', dashboardsObj);
  }

  /**
   * Create default dashboard structure
   * @returns {Object} Default dashboard
   */
  function createDefaultDashboard() {
    return {
      id: 'default',
      name: 'Main Dashboard',
      cards: [],
      gridLayout: [],
      settings: {
        theme: 'inherit',
        gridOptions: { ...gridSettings.value }
      },
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
  }

  /**
   * Generate unique card ID
   * @returns {string} Unique card ID
   */
  function generateCardId() {
    return `card_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate default layout for new card
   * @param {Object} card - Card configuration
   * @returns {Object} Default layout
   */
  function generateDefaultLayout(card) {
    const existingLayouts = activeDashboard.value.gridLayout;
    
    // Find next available position
    let x = 0;
    let y = 0;
    
    // Simple placement algorithm - place cards in a row
    if (existingLayouts.length > 0) {
      const lastLayout = existingLayouts[existingLayouts.length - 1];
      x = lastLayout.x + lastLayout.w;
      y = lastLayout.y;
      
      // Wrap to next row if needed
      if (x + getDefaultWidth(card.type) > 12) {
        x = 0;
        y = Math.max(...existingLayouts.map(l => l.y + l.h));
      }
    }
    
    return {
      id: card.id,
      x,
      y,
      w: getDefaultWidth(card.type),
      h: getDefaultHeight(card.type)
    };
  }

  /**
   * Get default width for card type
   * @param {string} type - Card type
   * @returns {number} Default width
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
   * @param {string} type - Card type
   * @returns {number} Default height
   */
  function getDefaultHeight(type) {
    switch (type) {
      case 'publisher': return 3;
      case 'subscriber': return 4;
      case 'chart': return 6;
      default: return 3;
    }
  }

  // Return store interface
  return {
    // State
    dashboards,
    activeDashboardId,
    isGridLoaded,
    gridSettings,
    
    // Computed
    activeDashboard,
    hasCards,
    gridOptions,
    
    // Actions
    initialize,
    createDashboard,
    deleteDashboard,
    switchDashboard,
    updateDashboard,
    addCard,
    removeCard,
    updateCard,
    updateGridLayout,
    getCard,
    getCardLayout,
    setGridLoaded,
    exportDashboard,
    importDashboard
  };
});

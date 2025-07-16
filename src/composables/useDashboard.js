import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useDashboardStore } from '@/stores/dashboard.js';
import { useCardsStore } from '@/stores/cards.js';
import { useNatsConnection } from '@/composables/useNatsConnection.js';

/**
 * Composable for dashboard management and grid operations
 * Provides reactive dashboard state and grid management functionality
 * 
 * @returns {Object} Dashboard state and methods
 */
export function useDashboard() {
  const dashboardStore = useDashboardStore();
  const cardsStore = useCardsStore();
  const { isConnected } = useNatsConnection();
  
  // Local reactive state
  const isLoading = ref(false);
  const error = ref(null);
  
  // Dashboard state (from store)
  const dashboards = computed(() => dashboardStore.dashboards);
  const activeDashboard = computed(() => dashboardStore.activeDashboard);
  const activeDashboardId = computed(() => dashboardStore.activeDashboardId);
  const hasCards = computed(() => dashboardStore.hasCards);
  const gridOptions = computed(() => dashboardStore.gridOptions);
  const isGridLoaded = computed(() => dashboardStore.isGridLoaded);
  
  // Dashboard operations
  
  /**
   * Initialize dashboard system
   * Sets up stores and prepares dashboard for use
   */
  async function initialize() {
    try {
      isLoading.value = true;
      error.value = null;
      
      // Initialize stores
      dashboardStore.initialize();
      cardsStore.initialize();
      
      console.log('[useDashboard] Dashboard system initialized');
    } catch (err) {
      error.value = err.message;
      console.error('[useDashboard] Initialization failed:', err);
    } finally {
      isLoading.value = false;
    }
  }
  
  /**
   * Create a new dashboard
   * @param {string} name - Dashboard name
   * @returns {Object} Created dashboard
   */
  async function createDashboard(name) {
    try {
      isLoading.value = true;
      error.value = null;
      
      const id = generateDashboardId(name);
      const dashboard = dashboardStore.createDashboard(id, name);
      
      console.log('[useDashboard] Created dashboard:', dashboard);
      return dashboard;
    } catch (err) {
      error.value = err.message;
      console.error('[useDashboard] Failed to create dashboard:', err);
      throw err;
    } finally {
      isLoading.value = false;
    }
  }
  
  /**
   * Switch to a different dashboard
   * @param {string} id - Dashboard ID
   */
  async function switchDashboard(id) {
    try {
      isLoading.value = true;
      error.value = null;
      
      // Cleanup current dashboard cards
      await cleanupCurrentDashboard();
      
      // Switch dashboard
      dashboardStore.switchDashboard(id);
      
      // Initialize new dashboard cards
      await initializeDashboardCards();
      
      console.log('[useDashboard] Switched to dashboard:', id);
    } catch (err) {
      error.value = err.message;
      console.error('[useDashboard] Failed to switch dashboard:', err);
      throw err;
    } finally {
      isLoading.value = false;
    }
  }
  
  /**
   * Delete a dashboard
   * @param {string} id - Dashboard ID
   */
  async function deleteDashboard(id) {
    try {
      isLoading.value = true;
      error.value = null;
      
      // Cleanup cards if this is the active dashboard
      if (id === activeDashboardId.value) {
        await cleanupCurrentDashboard();
      }
      
      const success = dashboardStore.deleteDashboard(id);
      
      if (!success) {
        throw new Error('Failed to delete dashboard');
      }
      
      console.log('[useDashboard] Deleted dashboard:', id);
    } catch (err) {
      error.value = err.message;
      console.error('[useDashboard] Failed to delete dashboard:', err);
      throw err;
    } finally {
      isLoading.value = false;
    }
  }
  
  /**
   * Update dashboard metadata
   * @param {string} id - Dashboard ID
   * @param {Object} updates - Updates to apply
   */
  function updateDashboard(id, updates) {
    try {
      const success = dashboardStore.updateDashboard(id, updates);
      
      if (!success) {
        throw new Error('Dashboard not found');
      }
      
      console.log('[useDashboard] Updated dashboard:', id);
    } catch (err) {
      error.value = err.message;
      console.error('[useDashboard] Failed to update dashboard:', err);
      throw err;
    }
  }
  
  // Card operations
  
  /**
   * Add a new card to the active dashboard
   * @param {Object} cardConfig - Card configuration
   * @returns {Object} Created card
   */
  async function addCard(cardConfig) {
    try {
      if (!isConnected.value) {
        throw new Error('Must be connected to NATS to add cards');
      }
      
      isLoading.value = true;
      error.value = null;
      
      // Create card with default layout
      const card = {
        ...cardConfig,
        id: cardConfig.id || generateCardId(),
        type: cardConfig.type || 'publisher',
        title: cardConfig.title || 'New Card',
        config: cardConfig.config || {}
      };
      
      // Add to dashboard store
      const createdCard = dashboardStore.addCard(card);
      
      // Initialize card state
      cardsStore.initializeCard(createdCard.id, createdCard);
      
      console.log('[useDashboard] Added card:', createdCard);
      return createdCard;
    } catch (err) {
      error.value = err.message;
      console.error('[useDashboard] Failed to add card:', err);
      throw err;
    } finally {
      isLoading.value = false;
    }
  }
  
  /**
   * Remove a card from the active dashboard
   * @param {string} cardId - Card ID
   */
  async function removeCard(cardId) {
    try {
      isLoading.value = true;
      error.value = null;
      
      // Cleanup card state
      await cardsStore.cleanupCard(cardId);
      
      // Remove from dashboard store
      const success = dashboardStore.removeCard(cardId);
      
      if (!success) {
        throw new Error('Card not found');
      }
      
      console.log('[useDashboard] Removed card:', cardId);
    } catch (err) {
      error.value = err.message;
      console.error('[useDashboard] Failed to remove card:', err);
      throw err;
    } finally {
      isLoading.value = false;
    }
  }
  
  /**
   * Update card configuration
   * @param {string} cardId - Card ID
   * @param {Object} updates - Updates to apply
   */
  function updateCard(cardId, updates) {
    try {
      const success = dashboardStore.updateCard(cardId, updates);
      
      if (!success) {
        throw new Error('Card not found');
      }
      
      console.log('[useDashboard] Updated card:', cardId);
    } catch (err) {
      error.value = err.message;
      console.error('[useDashboard] Failed to update card:', err);
      throw err;
    }
  }
  
  // Grid operations
  
  /**
   * Update grid layout
   * @param {Array} layout - New grid layout
   */
  function updateGridLayout(layout) {
    try {
      dashboardStore.updateGridLayout(layout);
      console.log('[useDashboard] Grid layout updated');
    } catch (err) {
      error.value = err.message;
      console.error('[useDashboard] Failed to update grid layout:', err);
    }
  }
  
  /**
   * Get grid layout for a card
   * @param {string} cardId - Card ID
   * @returns {Object|null} Grid layout item or null
   */
  function getCardLayout(cardId) {
    return dashboardStore.getCardLayout(cardId);
  }
  
  /**
   * Set grid loaded state
   * @param {boolean} loaded - Load state
   */
  function setGridLoaded(loaded) {
    dashboardStore.setGridLoaded(loaded);
  }
  
  // Utility functions
  
  /**
   * Get card by ID
   * @param {string} cardId - Card ID
   * @returns {Object|null} Card or null
   */
  function getCard(cardId) {
    return dashboardStore.getCard(cardId);
  }
  
  /**
   * Export dashboard
   * @param {string} id - Dashboard ID (optional, defaults to active)
   * @returns {Object} Dashboard export data
   */
  function exportDashboard(id = activeDashboardId.value) {
    return dashboardStore.exportDashboard(id);
  }
  
  /**
   * Import dashboard
   * @param {Object} config - Dashboard configuration
   * @returns {boolean} Success status
   */
  function importDashboard(config) {
    return dashboardStore.importDashboard(config);
  }
  
  /**
   * Clear error state
   */
  function clearError() {
    error.value = null;
  }
  
  // Private helper functions
  
  /**
   * Cleanup current dashboard cards
   */
  async function cleanupCurrentDashboard() {
    const cards = activeDashboard.value.cards;
    
    for (const card of cards) {
      try {
        await cardsStore.cleanupCard(card.id);
      } catch (err) {
        console.error('[useDashboard] Failed to cleanup card:', card.id, err);
      }
    }
  }
  
  /**
   * Initialize dashboard cards
   */
  async function initializeDashboardCards() {
    const cards = activeDashboard.value.cards;
    
    for (const card of cards) {
      try {
        cardsStore.initializeCard(card.id, card);
      } catch (err) {
        console.error('[useDashboard] Failed to initialize card:', card.id, err);
      }
    }
  }
  
  /**
   * Generate unique dashboard ID
   * @param {string} name - Dashboard name
   * @returns {string} Unique ID
   */
  function generateDashboardId(name) {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    return `${slug}-${Date.now()}`;
  }
  
  /**
   * Generate unique card ID
   * @returns {string} Unique ID
   */
  function generateCardId() {
    return `card-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  // Lifecycle management
  onMounted(() => {
    console.log('[useDashboard] Dashboard composable mounted');
    
    // Initialize if not already done
    if (!dashboardStore.dashboards.has('default')) {
      initialize();
    }
  });
  
  onUnmounted(() => {
    console.log('[useDashboard] Dashboard composable unmounted');
    
    // Cleanup if needed
    clearError();
  });
  
  // Return composable interface
  return {
    // State
    dashboards,
    activeDashboard,
    activeDashboardId,
    hasCards,
    gridOptions,
    isGridLoaded,
    isLoading,
    error,
    
    // Dashboard operations
    initialize,
    createDashboard,
    switchDashboard,
    deleteDashboard,
    updateDashboard,
    
    // Card operations
    addCard,
    removeCard,
    updateCard,
    getCard,
    
    // Grid operations
    updateGridLayout,
    getCardLayout,
    setGridLoaded,
    
    // Utilities
    exportDashboard,
    importDashboard,
    clearError
  };
}

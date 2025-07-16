import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useCardsStore } from '@/stores/cards.js';
import { useNatsConnection } from '@/composables/useNatsConnection.js';
import { useToast } from '@/composables/useToast.js';

/**
 * Composable for card operations and state management
 * Provides reactive card state and NATS messaging functionality
 * 
 * @param {string} cardId - Card ID (optional, for single card usage)
 * @returns {Object} Card state and methods
 */
export function useCards(cardId = null) {
  const cardsStore = useCardsStore();
  const { isConnected } = useNatsConnection();
  const { success, error: showError, warning } = useToast();
  
  // Local reactive state
  const isLoading = ref(false);
  const error = ref(null);
  
  // Card state (from store)
  const cardStates = computed(() => cardsStore.cardStates);
  const cardSubscriptions = computed(() => cardsStore.cardSubscriptions);
  const cardMessages = computed(() => cardsStore.cardMessages);
  const cardMetrics = computed(() => cardsStore.cardMetrics);
  const subscribedCards = computed(() => cardsStore.subscribedCards);
  const totalSubscriptions = computed(() => cardsStore.totalSubscriptions);
  const totalMessages = computed(() => cardsStore.totalMessages);
  
  // Single card state (when cardId is provided)
  const cardState = computed(() => {
    return cardId ? cardsStore.getCardState(cardId) : null;
  });
  
  const cardMessages_single = computed(() => {
    return cardId ? cardsStore.getCardMessages(cardId) : [];
  });
  
  const cardMetrics_single = computed(() => {
    return cardId ? cardsStore.getCardMetrics(cardId) : null;
  });
  
  const isSubscribed = computed(() => {
    return cardId ? cardsStore.isCardSubscribed(cardId) : false;
  });
  
  const isPublishing = computed(() => {
    return cardId ? cardsStore.isCardPublishing(cardId) : false;
  });
  
  // Card operations
  
  /**
   * Initialize card state
   * @param {string} id - Card ID
   * @param {Object} config - Card configuration
   */
  function initializeCard(id, config) {
    try {
      cardsStore.initializeCard(id, config);
      console.log('[useCards] Initialized card:', id);
    } catch (err) {
      error.value = err.message;
      console.error('[useCards] Failed to initialize card:', id, err);
    }
  }
  
  /**
   * Subscribe to NATS topic
   * @param {string} id - Card ID (optional if cardId is set)
   * @param {string} topic - NATS topic
   * @param {Object} options - Subscription options
   */
  async function subscribe(id, topic, options = {}) {
    const targetCardId = id || cardId;
    
    if (!targetCardId) {
      throw new Error('Card ID is required');
    }
    
    if (!isConnected.value) {
      const message = 'Must be connected to NATS to subscribe';
      error.value = message;
      showError(message);
      return false;
    }
    
    if (!topic) {
      const message = 'Topic is required for subscription';
      error.value = message;
      showError(message);
      return false;
    }
    
    try {
      isLoading.value = true;
      error.value = null;
      
      const success_result = await cardsStore.subscribeCard(targetCardId, topic);
      
      if (success_result) {
        success(`Subscribed to ${topic}`);
        console.log('[useCards] Successfully subscribed:', targetCardId, topic);
      } else {
        throw new Error('Subscription failed');
      }
      
      return success_result;
    } catch (err) {
      error.value = err.message;
      showError(`Subscription failed: ${err.message}`);
      console.error('[useCards] Subscription failed:', targetCardId, topic, err);
      return false;
    } finally {
      isLoading.value = false;
    }
  }
  
  /**
   * Unsubscribe from NATS topic
   * @param {string} id - Card ID (optional if cardId is set)
   */
  async function unsubscribe(id) {
    const targetCardId = id || cardId;
    
    if (!targetCardId) {
      throw new Error('Card ID is required');
    }
    
    try {
      isLoading.value = true;
      error.value = null;
      
      const success_result = await cardsStore.unsubscribeCard(targetCardId);
      
      if (success_result) {
        success('Unsubscribed from topic');
        console.log('[useCards] Successfully unsubscribed:', targetCardId);
      }
      
      return success_result;
    } catch (err) {
      error.value = err.message;
      showError(`Unsubscribe failed: ${err.message}`);
      console.error('[useCards] Unsubscribe failed:', targetCardId, err);
      return false;
    } finally {
      isLoading.value = false;
    }
  }
  
  /**
   * Publish message to NATS topic
   * @param {string} id - Card ID (optional if cardId is set)
   * @param {string} topic - NATS topic
   * @param {Object|string} payload - Message payload
   * @param {Object} options - Publish options
   */
  async function publish(id, topic, payload, options = {}) {
    const targetCardId = id || cardId;
    
    if (!targetCardId) {
      throw new Error('Card ID is required');
    }
    
    if (!isConnected.value) {
      const message = 'Must be connected to NATS to publish';
      error.value = message;
      showError(message);
      return false;
    }
    
    if (!topic) {
      const message = 'Topic is required for publishing';
      error.value = message;
      showError(message);
      return false;
    }
    
    try {
      isLoading.value = true;
      error.value = null;
      
      const success_result = await cardsStore.publishFromCard(targetCardId, topic, payload);
      
      if (success_result) {
        success(`Published to ${topic}`);
        console.log('[useCards] Successfully published:', targetCardId, topic);
      } else {
        throw new Error('Publish failed');
      }
      
      return success_result;
    } catch (err) {
      error.value = err.message;
      showError(`Publish failed: ${err.message}`);
      console.error('[useCards] Publish failed:', targetCardId, topic, err);
      return false;
    } finally {
      isLoading.value = false;
    }
  }
  
  /**
   * Clear messages for a card
   * @param {string} id - Card ID (optional if cardId is set)
   */
  function clearMessages(id) {
    const targetCardId = id || cardId;
    
    if (!targetCardId) {
      console.warn('[useCards] Card ID is required to clear messages');
      return;
    }
    
    try {
      cardsStore.clearCardMessages(targetCardId);
      console.log('[useCards] Cleared messages for card:', targetCardId);
    } catch (err) {
      error.value = err.message;
      console.error('[useCards] Failed to clear messages:', targetCardId, err);
    }
  }
  
  /**
   * Get card state
   * @param {string} id - Card ID (optional if cardId is set)
   * @returns {Object|null} Card state
   */
  function getCardState(id) {
    const targetCardId = id || cardId;
    return cardsStore.getCardState(targetCardId);
  }
  
  /**
   * Get card messages
   * @param {string} id - Card ID (optional if cardId is set)
   * @param {number} limit - Maximum number of messages
   * @returns {Array} Messages array
   */
  function getCardMessages(id, limit = 100) {
    const targetCardId = id || cardId;
    return cardsStore.getCardMessages(targetCardId, limit);
  }
  
  /**
   * Get card metrics
   * @param {string} id - Card ID (optional if cardId is set)
   * @returns {Object|null} Card metrics
   */
  function getCardMetrics(id) {
    const targetCardId = id || cardId;
    return cardsStore.getCardMetrics(targetCardId);
  }
  
  /**
   * Check if card is subscribed
   * @param {string} id - Card ID (optional if cardId is set)
   * @returns {boolean} Subscription status
   */
  function isCardSubscribed(id) {
    const targetCardId = id || cardId;
    return cardsStore.isCardSubscribed(targetCardId);
  }
  
  /**
   * Check if card is publishing
   * @param {string} id - Card ID (optional if cardId is set)
   * @returns {boolean} Publishing status
   */
  function isCardPublishing(id) {
    const targetCardId = id || cardId;
    return cardsStore.isCardPublishing(targetCardId);
  }
  
  /**
   * Get publish history
   * @param {string} id - Card ID (optional if cardId is set)
   * @param {number} limit - Maximum number of entries
   * @returns {Array} Publish history
   */
  function getPublishHistory(id, limit = 50) {
    const targetCardId = id || cardId;
    return cardsStore.getPublishHistory(targetCardId, limit);
  }
  
  /**
   * Cleanup card state
   * @param {string} id - Card ID (optional if cardId is set)
   */
  async function cleanupCard(id) {
    const targetCardId = id || cardId;
    
    if (!targetCardId) {
      console.warn('[useCards] Card ID is required to cleanup');
      return;
    }
    
    try {
      await cardsStore.cleanupCard(targetCardId);
      console.log('[useCards] Cleaned up card:', targetCardId);
    } catch (err) {
      error.value = err.message;
      console.error('[useCards] Failed to cleanup card:', targetCardId, err);
    }
  }
  
  // Utility functions
  
  /**
   * Validate topic string
   * @param {string} topic - Topic to validate
   * @returns {Object} Validation result
   */
  function validateTopic(topic) {
    if (!topic || typeof topic !== 'string') {
      return { valid: false, error: 'Topic must be a non-empty string' };
    }
    
    if (topic.trim().length === 0) {
      return { valid: false, error: 'Topic cannot be empty' };
    }
    
    // Basic NATS topic validation
    if (topic.includes(' ')) {
      return { valid: false, error: 'Topic cannot contain spaces' };
    }
    
    return { valid: true };
  }
  
  /**
   * Validate payload
   * @param {any} payload - Payload to validate
   * @returns {Object} Validation result
   */
  function validatePayload(payload) {
    if (payload === undefined || payload === null) {
      return { valid: false, error: 'Payload cannot be null or undefined' };
    }
    
    // Try to serialize payload
    try {
      JSON.stringify(payload);
      return { valid: true };
    } catch (err) {
      return { valid: false, error: 'Payload must be JSON serializable' };
    }
  }
  
  /**
   * Format message for display
   * @param {Object} message - Message to format
   * @returns {Object} Formatted message
   */
  function formatMessage(message) {
    if (!message) return null;
    
    return {
      id: message.id,
      topic: message.topic,
      payload: message.payload,
      timestamp: message.timestamp || message.receivedAt,
      size: JSON.stringify(message.payload).length,
      type: typeof message.payload
    };
  }
  
  /**
   * Create default card configuration
   * @param {string} type - Card type
   * @returns {Object} Default configuration
   */
  function createDefaultCardConfig(type) {
    const base = {
      type,
      title: `New ${type.charAt(0).toUpperCase() + type.slice(1)} Card`,
      config: {}
    };
    
    switch (type) {
      case 'publisher':
        return {
          ...base,
          config: {
            buttons: [{
              label: 'Send Message',
              topic: 'test.topic',
              payload: { message: 'Hello World' },
              style: { color: '#ffffff', bgColor: '#3b82f6' }
            }]
          }
        };
        
      case 'subscriber':
        return {
          ...base,
          config: {
            topic: 'test.topic',
            displayType: 'json',
            maxMessages: 100,
            autoScroll: true
          }
        };
        
      default:
        return base;
    }
  }
  
  /**
   * Clear error state
   */
  function clearError() {
    error.value = null;
  }
  
  // Lifecycle management
  onMounted(() => {
    console.log('[useCards] Cards composable mounted', cardId ? `for card: ${cardId}` : '');
  });
  
  onUnmounted(() => {
    console.log('[useCards] Cards composable unmounted', cardId ? `for card: ${cardId}` : '');
    
    // Cleanup single card if specified
    if (cardId) {
      cleanupCard(cardId);
    }
    
    // Clear error state
    clearError();
  });
  
  // Return composable interface
  return {
    // Global state
    cardStates,
    cardSubscriptions,
    cardMessages,
    cardMetrics,
    subscribedCards,
    totalSubscriptions,
    totalMessages,
    
    // Single card state (when cardId is provided)
    cardState,
    cardMessages: cardMessages_single,
    cardMetrics: cardMetrics_single,
    isSubscribed,
    isPublishing,
    
    // Local state
    isLoading,
    error,
    
    // Operations
    initializeCard,
    subscribe,
    unsubscribe,
    publish,
    clearMessages,
    cleanupCard,
    
    // Getters
    getCardState,
    getCardMessages,
    getCardMetrics,
    isCardSubscribed,
    isCardPublishing,
    getPublishHistory,
    
    // Utilities
    validateTopic,
    validatePayload,
    formatMessage,
    createDefaultCardConfig,
    clearError
  };
}

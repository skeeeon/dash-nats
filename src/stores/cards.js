import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import natsService from '@/services/NatsService.js';

/**
 * Pinia store for managing card state and NATS operations
 * Handles card subscriptions, publishing, and message state
 */
export const useCardsStore = defineStore('cards', () => {
  // State
  const cardStates = ref(new Map());
  const cardSubscriptions = ref(new Map()); // cardId -> subscriptionId
  const cardMessages = ref(new Map()); // cardId -> messages array
  const cardMetrics = ref(new Map()); // cardId -> metrics object
  
  // Publishing state
  const publishingCards = ref(new Set());
  const publishHistory = ref(new Map()); // cardId -> publish history
  
  // Computed properties
  const subscribedCards = computed(() => {
    return Array.from(cardSubscriptions.value.keys());
  });

  const totalSubscriptions = computed(() => {
    return cardSubscriptions.value.size;
  });

  const totalMessages = computed(() => {
    let total = 0;
    cardMessages.value.forEach((messages) => {
      total += messages.length;
    });
    return total;
  });

  // Actions

  /**
   * Initialize cards store
   * Sets up NATS event listeners and prepares card state
   */
  function initialize() {
    console.log('[CardsStore] Initializing cards store');
    
    // Set up NATS service event listeners
    setupNatsEventListeners();
    
    // Clean up any orphaned subscriptions
    cleanupOrphanedSubscriptions();
  }

  /**
   * Initialize card state
   * @param {string} cardId - Card ID
   * @param {Object} cardConfig - Card configuration
   */
  function initializeCard(cardId, cardConfig) {
    // Set initial card state
    cardStates.value.set(cardId, {
      id: cardId,
      type: cardConfig.type,
      status: 'idle',
      error: null,
      lastActivity: null,
      isActive: true
    });
    
    // Initialize messages array
    cardMessages.value.set(cardId, []);
    
    // Initialize metrics
    cardMetrics.value.set(cardId, {
      totalMessages: 0,
      messagesPerSecond: 0,
      lastMessageTime: null,
      errorCount: 0,
      startTime: Date.now()
    });
    
    console.log(`[CardsStore] Initialized card: ${cardId}`);
  }

  /**
   * Cleanup card state when card is removed
   * @param {string} cardId - Card ID to cleanup
   */
  async function cleanupCard(cardId) {
    // Unsubscribe if subscribed
    if (cardSubscriptions.value.has(cardId)) {
      await unsubscribeCard(cardId);
    }
    
    // Remove from all state maps
    cardStates.value.delete(cardId);
    cardMessages.value.delete(cardId);
    cardMetrics.value.delete(cardId);
    publishingCards.value.delete(cardId);
    publishHistory.value.delete(cardId);
    
    console.log(`[CardsStore] Cleaned up card: ${cardId}`);
  }

  /**
   * Subscribe card to NATS topic
   * @param {string} cardId - Card ID
   * @param {string} topic - NATS topic to subscribe to
   * @returns {Promise<boolean>} Success status
   */
  async function subscribeCard(cardId, topic) {
    if (!topic) {
      console.error('[CardsStore] Cannot subscribe: topic is required');
      return false;
    }
    
    try {
      // Unsubscribe if already subscribed
      if (cardSubscriptions.value.has(cardId)) {
        await unsubscribeCard(cardId);
      }
      
      // Update card state
      updateCardState(cardId, { status: 'subscribing' });
      
      // Create subscription
      const subscriptionId = await natsService.subscribe(topic, (message) => {
        handleCardMessage(cardId, message);
      });
      
      // Store subscription
      cardSubscriptions.value.set(cardId, subscriptionId);
      
      // Update card state
      updateCardState(cardId, { 
        status: 'subscribed',
        lastActivity: Date.now(),
        error: null
      });
      
      console.log(`[CardsStore] Subscribed card ${cardId} to topic: ${topic}`);
      return true;
      
    } catch (error) {
      console.error(`[CardsStore] Subscription failed for card ${cardId}:`, error);
      
      updateCardState(cardId, { 
        status: 'error',
        error: error.message 
      });
      
      return false;
    }
  }

  /**
   * Unsubscribe card from NATS topic
   * @param {string} cardId - Card ID
   * @returns {Promise<boolean>} Success status
   */
  async function unsubscribeCard(cardId) {
    const subscriptionId = cardSubscriptions.value.get(cardId);
    if (!subscriptionId) {
      return true; // Already unsubscribed
    }
    
    try {
      await natsService.unsubscribe(subscriptionId);
      cardSubscriptions.value.delete(cardId);
      
      updateCardState(cardId, { 
        status: 'idle',
        lastActivity: Date.now()
      });
      
      console.log(`[CardsStore] Unsubscribed card: ${cardId}`);
      return true;
      
    } catch (error) {
      console.error(`[CardsStore] Unsubscribe failed for card ${cardId}:`, error);
      
      updateCardState(cardId, { 
        status: 'error',
        error: error.message 
      });
      
      return false;
    }
  }

  /**
   * Publish message from card
   * @param {string} cardId - Card ID
   * @param {string} topic - NATS topic
   * @param {Object|string} payload - Message payload
   * @returns {Promise<boolean>} Success status
   */
  async function publishFromCard(cardId, topic, payload) {
    if (!topic) {
      console.error('[CardsStore] Cannot publish: topic is required');
      return false;
    }
    
    try {
      // Mark card as publishing
      publishingCards.value.add(cardId);
      
      // Update card state
      updateCardState(cardId, { 
        status: 'publishing',
        lastActivity: Date.now()
      });
      
      // Publish message
      await natsService.publish(topic, payload);
      
      // Record publish history
      recordPublishHistory(cardId, topic, payload);
      
      // Update card state
      updateCardState(cardId, { 
        status: 'idle',
        lastActivity: Date.now(),
        error: null
      });
      
      console.log(`[CardsStore] Published from card ${cardId} to topic: ${topic}`);
      return true;
      
    } catch (error) {
      console.error(`[CardsStore] Publish failed for card ${cardId}:`, error);
      
      updateCardState(cardId, { 
        status: 'error',
        error: error.message 
      });
      
      return false;
    } finally {
      publishingCards.value.delete(cardId);
    }
  }

  /**
   * Get card state
   * @param {string} cardId - Card ID
   * @returns {Object|null} Card state or null if not found
   */
  function getCardState(cardId) {
    return cardStates.value.get(cardId) || null;
  }

  /**
   * Get card messages
   * @param {string} cardId - Card ID
   * @param {number} limit - Maximum number of messages to return
   * @returns {Array} Array of messages
   */
  function getCardMessages(cardId, limit = 100) {
    const messages = cardMessages.value.get(cardId) || [];
    return limit > 0 ? messages.slice(-limit) : messages;
  }

  /**
   * Get card metrics
   * @param {string} cardId - Card ID
   * @returns {Object|null} Card metrics or null if not found
   */
  function getCardMetrics(cardId) {
    return cardMetrics.value.get(cardId) || null;
  }

  /**
   * Clear card messages
   * @param {string} cardId - Card ID
   */
  function clearCardMessages(cardId) {
    cardMessages.value.set(cardId, []);
    
    // Reset message metrics
    const metrics = cardMetrics.value.get(cardId);
    if (metrics) {
      metrics.totalMessages = 0;
      metrics.messagesPerSecond = 0;
      metrics.lastMessageTime = null;
    }
    
    console.log(`[CardsStore] Cleared messages for card: ${cardId}`);
  }

  /**
   * Check if card is subscribed
   * @param {string} cardId - Card ID
   * @returns {boolean} Subscription status
   */
  function isCardSubscribed(cardId) {
    return cardSubscriptions.value.has(cardId);
  }

  /**
   * Check if card is publishing
   * @param {string} cardId - Card ID
   * @returns {boolean} Publishing status
   */
  function isCardPublishing(cardId) {
    return publishingCards.value.has(cardId);
  }

  /**
   * Get publish history for card
   * @param {string} cardId - Card ID
   * @param {number} limit - Maximum number of entries to return
   * @returns {Array} Publish history
   */
  function getPublishHistory(cardId, limit = 50) {
    const history = publishHistory.value.get(cardId) || [];
    return limit > 0 ? history.slice(-limit) : history;
  }

  // Private helper functions

  /**
   * Handle incoming message for a card
   * @param {string} cardId - Card ID
   * @param {Object} message - NATS message
   */
  function handleCardMessage(cardId, message) {
    // Get current messages
    const messages = cardMessages.value.get(cardId) || [];
    
    // Add new message
    messages.push({
      ...message,
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      receivedAt: Date.now()
    });
    
    // Limit message history (keep last 1000 messages)
    if (messages.length > 1000) {
      messages.splice(0, messages.length - 1000);
    }
    
    // Update messages
    cardMessages.value.set(cardId, messages);
    
    // Update metrics
    updateCardMetrics(cardId);
    
    // Update card state
    updateCardState(cardId, { 
      lastActivity: Date.now(),
      error: null
    });
  }

  /**
   * Update card state
   * @param {string} cardId - Card ID
   * @param {Object} updates - State updates
   */
  function updateCardState(cardId, updates) {
    const currentState = cardStates.value.get(cardId);
    if (currentState) {
      Object.assign(currentState, updates);
    }
  }

  /**
   * Update card metrics
   * @param {string} cardId - Card ID
   */
  function updateCardMetrics(cardId) {
    const metrics = cardMetrics.value.get(cardId);
    const messages = cardMessages.value.get(cardId);
    
    if (!metrics || !messages) return;
    
    const now = Date.now();
    const messageCount = messages.length;
    
    // Update basic metrics
    metrics.totalMessages = messageCount;
    metrics.lastMessageTime = now;
    
    // Calculate messages per second (over last 10 seconds)
    const tenSecondsAgo = now - 10000;
    const recentMessages = messages.filter(msg => msg.receivedAt > tenSecondsAgo);
    metrics.messagesPerSecond = recentMessages.length / 10;
  }

  /**
   * Record publish history
   * @param {string} cardId - Card ID
   * @param {string} topic - NATS topic
   * @param {Object|string} payload - Message payload
   */
  function recordPublishHistory(cardId, topic, payload) {
    const history = publishHistory.value.get(cardId) || [];
    
    history.push({
      topic,
      payload,
      timestamp: Date.now(),
      success: true
    });
    
    // Limit history (keep last 100 entries)
    if (history.length > 100) {
      history.splice(0, history.length - 100);
    }
    
    publishHistory.value.set(cardId, history);
  }

  /**
   * Setup NATS service event listeners
   */
  function setupNatsEventListeners() {
    // Listen for connection events that might affect card subscriptions
    natsService.addEventListener('disconnected', () => {
      // Mark all subscribed cards as disconnected
      cardSubscriptions.value.forEach((subscriptionId, cardId) => {
        updateCardState(cardId, { 
          status: 'disconnected',
          error: 'Connection lost'
        });
      });
      
      // Clear subscriptions map (they're invalid now)
      cardSubscriptions.value.clear();
    });
    
    natsService.addEventListener('connected', () => {
      // Mark all cards as ready to reconnect
      cardStates.value.forEach((state, cardId) => {
        if (state.status === 'disconnected') {
          updateCardState(cardId, { 
            status: 'idle',
            error: null
          });
        }
      });
    });
  }

  /**
   * Clean up orphaned subscriptions
   */
  function cleanupOrphanedSubscriptions() {
    // This would be called during initialization to clean up
    // any subscriptions that might have been left over
    console.log('[CardsStore] Cleaning up orphaned subscriptions');
  }

  // Return store interface
  return {
    // State
    cardStates,
    cardSubscriptions,
    cardMessages,
    cardMetrics,
    publishingCards,
    publishHistory,
    
    // Computed
    subscribedCards,
    totalSubscriptions,
    totalMessages,
    
    // Actions
    initialize,
    initializeCard,
    cleanupCard,
    subscribeCard,
    unsubscribeCard,
    publishFromCard,
    getCardState,
    getCardMessages,
    getCardMetrics,
    clearCardMessages,
    isCardSubscribed,
    isCardPublishing,
    getPublishHistory
  };
});

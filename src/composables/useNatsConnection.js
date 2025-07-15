import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useConnectionStore } from '@/stores/connection.js';
import natsService from '@/services/NatsService.js';

/**
 * Composable for managing NATS connection functionality
 * Provides reactive connection state and operations for Vue components
 * 
 * @returns {Object} Connection state and methods
 */
export function useNatsConnection() {
  const connectionStore = useConnectionStore();
  
  // Local reactive state for component-specific needs
  const lastError = ref(null);
  const operationInProgress = ref(false);
  
  // Connection state (from store)
  const isConnected = computed(() => connectionStore.isConnected);
  const isConnecting = computed(() => connectionStore.isConnecting);
  const connectionError = computed(() => connectionStore.connectionError);
  const connectionStatus = computed(() => connectionStore.connectionStatus);
  const connectionStatusText = computed(() => connectionStore.connectionStatusText);
  const currentConfig = computed(() => connectionStore.currentConfig);
  const savedConfigs = computed(() => connectionStore.savedConfigs);
  const connectionStats = computed(() => connectionStore.connectionStats);
  
  // Derived state
  const canConnect = computed(() => connectionStore.canConnect && !operationInProgress.value);
  const canDisconnect = computed(() => connectionStore.canDisconnect && !operationInProgress.value);
  
  const isOnline = computed(() => {
    return navigator.onLine && isConnected.value;
  });
  
  // Connection operations
  
  /**
   * Connect to NATS server
   * @param {Object} config - Connection configuration
   * @returns {Promise<boolean>} Success status
   */
  async function connect(config) {
    if (!canConnect.value) {
      throw new Error('Cannot connect at this time');
    }

    try {
      operationInProgress.value = true;
      lastError.value = null;
      
      await connectionStore.connect(config);
      return true;
    } catch (error) {
      lastError.value = error;
      throw error;
    } finally {
      operationInProgress.value = false;
    }
  }

  /**
   * Disconnect from NATS server
   * @returns {Promise<void>}
   */
  async function disconnect() {
    if (!canDisconnect.value) {
      return;
    }

    try {
      operationInProgress.value = true;
      lastError.value = null;
      
      await connectionStore.disconnect();
    } catch (error) {
      lastError.value = error;
      throw error;
    } finally {
      operationInProgress.value = false;
    }
  }

  /**
   * Reconnect using current configuration
   * @returns {Promise<void>}
   */
  async function reconnect() {
    try {
      operationInProgress.value = true;
      lastError.value = null;
      
      await connectionStore.reconnect();
    } catch (error) {
      lastError.value = error;
      throw error;
    } finally {
      operationInProgress.value = false;
    }
  }

  /**
   * Test connection configuration
   * @param {Object} config - Configuration to test
   * @returns {Promise<boolean>} Test result
   */
  async function testConnection(config) {
    try {
      operationInProgress.value = true;
      lastError.value = null;
      
      return await connectionStore.testConnection(config);
    } catch (error) {
      lastError.value = error;
      return false;
    } finally {
      operationInProgress.value = false;
    }
  }

  // Publishing operations
  
  /**
   * Publish message to topic
   * @param {string} topic - NATS subject/topic
   * @param {Object|string} payload - Message payload
   * @returns {Promise<void>}
   */
  async function publish(topic, payload) {
    if (!isConnected.value) {
      throw new Error('Not connected to NATS server');
    }

    try {
      await natsService.publish(topic, payload);
    } catch (error) {
      lastError.value = error;
      throw error;
    }
  }

  // Subscription operations
  
  /**
   * Subscribe to topic
   * @param {string} topic - NATS subject/topic
   * @param {Function} callback - Message callback
   * @returns {Promise<string>} Subscription ID
   */
  async function subscribe(topic, callback) {
    if (!isConnected.value) {
      throw new Error('Not connected to NATS server');
    }

    try {
      return await natsService.subscribe(topic, callback);
    } catch (error) {
      lastError.value = error;
      throw error;
    }
  }

  /**
   * Unsubscribe from topic
   * @param {string} subscriptionId - Subscription ID
   * @returns {Promise<void>}
   */
  async function unsubscribe(subscriptionId) {
    try {
      await natsService.unsubscribe(subscriptionId);
    } catch (error) {
      lastError.value = error;
      throw error;
    }
  }

  // Configuration management
  
  /**
   * Save connection configuration
   * @param {Object} config - Configuration to save
   */
  function saveConfig(config) {
    connectionStore.addToSavedConfigs(config);
  }

  /**
   * Remove saved configuration
   * @param {string} configId - Configuration ID to remove
   */
  function removeSavedConfig(configId) {
    connectionStore.removeSavedConfig(configId);
  }

  /**
   * Clear all saved configurations
   */
  function clearSavedConfigs() {
    connectionStore.clearSavedConfigs();
  }

  // Utility functions
  
  /**
   * Get detailed connection information
   * @returns {Object} Connection information
   */
  function getConnectionInfo() {
    return {
      ...connectionStore.getConnectionInfo(),
      lastError: lastError.value,
      operationInProgress: operationInProgress.value,
      isOnline: isOnline.value
    };
  }

  /**
   * Clear last error
   */
  function clearError() {
    lastError.value = null;
  }

  /**
   * Create default connection configuration
   * @returns {Object} Default configuration
   */
  function createDefaultConfig() {
    return {
      name: 'New Connection',
      servers: ['ws://localhost:8080'],
      authType: 'none',
      username: '',
      password: '',
      credsContent: '',
      options: {
        reconnect: true,
        maxReconnectAttempts: 10,
        reconnectTimeWait: 2000,
        autoReconnectOnStartup: false
      }
    };
  }

  /**
   * Validate connection configuration
   * @param {Object} config - Configuration to validate
   * @returns {Object} Validation result
   */
  function validateConfig(config) {
    const errors = [];
    const warnings = [];

    // Required fields validation
    if (!config.servers || !Array.isArray(config.servers) || config.servers.length === 0) {
      errors.push('At least one server URL is required');
    }

    if (!config.authType) {
      errors.push('Authentication type is required');
    }

    // Server URL validation
    if (config.servers) {
      config.servers.forEach((server, index) => {
        try {
          const url = new URL(server);
          if (!['ws:', 'wss:'].includes(url.protocol)) {
            warnings.push(`Server ${index + 1}: Consider using ws:// or wss:// protocol`);
          }
        } catch {
          errors.push(`Server ${index + 1}: Invalid URL format`);
        }
      });
    }

    // Authentication validation
    if (config.authType === 'userpass') {
      if (!config.username?.trim()) {
        errors.push('Username is required for user/password authentication');
      }
      if (!config.password?.trim()) {
        errors.push('Password is required for user/password authentication');
      }
    }

    if (config.authType === 'creds') {
      if (!config.credsContent?.trim()) {
        errors.push('Credentials content is required for credentials authentication');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  // Lifecycle management
  onMounted(() => {
    // Initialize connection store if not already initialized
    if (typeof connectionStore.initialize === 'function') {
      connectionStore.initialize();
    }
  });

  onUnmounted(() => {
    // Clear any component-specific errors
    lastError.value = null;
    operationInProgress.value = false;
  });

  // Return composable interface
  return {
    // State
    isConnected,
    isConnecting,
    connectionError,
    connectionStatus,
    connectionStatusText,
    currentConfig,
    savedConfigs,
    connectionStats,
    lastError,
    operationInProgress,
    canConnect,
    canDisconnect,
    isOnline,
    
    // Connection operations
    connect,
    disconnect,
    reconnect,
    testConnection,
    
    // Messaging operations
    publish,
    subscribe,
    unsubscribe,
    
    // Configuration management
    saveConfig,
    removeSavedConfig,
    clearSavedConfigs,
    
    // Utilities
    getConnectionInfo,
    clearError,
    createDefaultConfig,
    validateConfig
  };
}

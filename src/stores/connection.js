import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import natsService from '@/services/NatsService.js';
import storageService from '@/services/StorageService.js';

/**
 * Pinia store for managing NATS connection state and configuration
 */
export const useConnectionStore = defineStore('connection', () => {
  // State
  const isConnected = ref(false);
  const isConnecting = ref(false);
  const connectionError = ref(null);
  const lastConnectionAttempt = ref(null);
  
  // Current connection configuration
  const currentConfig = ref(null);
  
  // Stored connection configurations (for quick reconnection)
  const savedConfigs = ref([]);
  
  // Connection statistics
  const connectionStats = ref({
    connectTime: null,
    reconnectCount: 0,
    totalMessages: 0,
    subscriptionsCount: 0
  });

  // Computed properties
  const connectionStatus = computed(() => {
    if (isConnecting.value) return 'connecting';
    if (isConnected.value) return 'connected';
    if (connectionError.value) return 'error';
    return 'disconnected';
  });

  const canConnect = computed(() => {
    return !isConnecting.value && !isConnected.value;
  });

  const canDisconnect = computed(() => {
    return isConnected.value && !isConnecting.value;
  });

  const connectionStatusText = computed(() => {
    switch (connectionStatus.value) {
      case 'connecting': return 'Connecting...';
      case 'connected': return 'Connected';
      case 'error': return connectionError.value?.message || 'Connection Error';
      default: return 'Disconnected';
    }
  });

  // Actions
  
  /**
   * Initialize the connection store
   * Loads saved configurations and sets up event listeners
   */
  function initialize() {
    // Load saved configurations
    loadSavedConfigs();
    
    // Setup NATS service event listeners
    setupNatsEventListeners();
    
    // Try to restore last connection if auto-reconnect is enabled
    const lastConfig = storageService.getConnectionConfig();
    if (lastConfig && lastConfig.options?.autoReconnectOnStartup) {
      // Delay auto-reconnection to allow UI to initialize
      setTimeout(() => {
        if (!isConnected.value) {
          connect(lastConfig);
        }
      }, 1000);
    }
  }

  /**
   * Connect to NATS server
   * @param {Object} config - Connection configuration
   */
  async function connect(config) {
    if (isConnecting.value || isConnected.value) {
      throw new Error('Connection already in progress or established');
    }

    try {
      // Validate configuration
      validateConnectionConfig(config);
      
      // Clear previous errors
      connectionError.value = null;
      isConnecting.value = true;
      lastConnectionAttempt.value = Date.now();
      
      // Attempt connection
      await natsService.connect(config);
      
      // Update state on successful connection
      isConnected.value = true;
      isConnecting.value = false;
      currentConfig.value = { ...config };
      
      // Update connection stats
      connectionStats.value.connectTime = Date.now();
      connectionStats.value.reconnectCount = 0;
      
      // Save configuration for persistence
      storageService.setConnectionConfig(config);
      
      // Add to saved configs if not already present
      addToSavedConfigs(config);
      
    } catch (error) {
      // Handle connection failure
      isConnecting.value = false;
      isConnected.value = false;
      connectionError.value = {
        message: error.message,
        timestamp: Date.now(),
        config: sanitizeConfig(config)
      };
      
      throw error;
    }
  }

  /**
   * Disconnect from NATS server
   */
  async function disconnect() {
    if (!isConnected.value && !isConnecting.value) {
      return;
    }

    try {
      await natsService.disconnect();
      
      // Reset state
      isConnected.value = false;
      isConnecting.value = false;
      currentConfig.value = null;
      connectionError.value = null;
      
      // Reset stats
      connectionStats.value.connectTime = null;
      connectionStats.value.subscriptionsCount = 0;
      
    } catch (error) {
      connectionError.value = {
        message: `Disconnect error: ${error.message}`,
        timestamp: Date.now()
      };
      throw error;
    }
  }

  /**
   * Reconnect using current configuration
   */
  async function reconnect() {
    if (!currentConfig.value) {
      throw new Error('No current configuration available for reconnection');
    }

    await disconnect();
    
    // Small delay before reconnecting
    await new Promise(resolve => setTimeout(resolve, 500));
    
    connectionStats.value.reconnectCount++;
    await connect(currentConfig.value);
  }

  /**
   * Test connection with provided configuration
   * @param {Object} config - Connection configuration to test
   * @returns {boolean} Test result
   */
  async function testConnection(config) {
    try {
      validateConnectionConfig(config);
      
      // Create a temporary service instance for testing
      const testService = new (await import('@/services/NatsService.js')).NatsService();
      
      await testService.connect(config);
      await testService.disconnect();
      await testService.cleanup();
      
      return true;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }

  /**
   * Add configuration to saved configs
   * @param {Object} config - Configuration to save
   */
  function addToSavedConfigs(config) {
    if (!config.name) return;
    
    const sanitized = sanitizeConfig(config);
    const existing = savedConfigs.value.find(c => c.name === config.name);
    
    if (existing) {
      // Update existing configuration
      Object.assign(existing, sanitized);
    } else {
      // Add new configuration
      savedConfigs.value.push({
        ...sanitized,
        id: generateConfigId(),
        createdAt: Date.now()
      });
    }
    
    // Save to storage
    storageService.setItem('saved_connections', savedConfigs.value);
  }

  /**
   * Remove configuration from saved configs
   * @param {string} configId - Configuration ID to remove
   */
  function removeSavedConfig(configId) {
    const index = savedConfigs.value.findIndex(c => c.id === configId);
    if (index > -1) {
      savedConfigs.value.splice(index, 1);
      storageService.setItem('saved_connections', savedConfigs.value);
    }
  }

  /**
   * Load saved configurations from storage
   */
  function loadSavedConfigs() {
    const saved = storageService.getItem('saved_connections', []);
    savedConfigs.value = Array.isArray(saved) ? saved : [];
  }

  /**
   * Clear all saved configurations
   */
  function clearSavedConfigs() {
    savedConfigs.value = [];
    storageService.removeItem('saved_connections');
  }

  /**
   * Get current connection status information
   * @returns {Object} Status information
   */
  function getConnectionInfo() {
    return {
      status: connectionStatus.value,
      statusText: connectionStatusText.value,
      isConnected: isConnected.value,
      isConnecting: isConnecting.value,
      error: connectionError.value,
      config: currentConfig.value ? sanitizeConfig(currentConfig.value) : null,
      stats: { ...connectionStats.value },
      natsStatus: natsService.getStatus()
    };
  }

  // Private helper functions

  /**
   * Setup event listeners for NATS service
   */
  function setupNatsEventListeners() {
    natsService.addEventListener('connected', () => {
      isConnected.value = true;
      isConnecting.value = false;
      connectionError.value = null;
    });

    natsService.addEventListener('disconnected', () => {
      isConnected.value = false;
      isConnecting.value = false;
      currentConfig.value = null;
    });

    natsService.addEventListener('error', (eventData) => {
      connectionError.value = {
        message: eventData.error?.message || 'Unknown error',
        timestamp: Date.now(),
        type: eventData.type
      };
      
      if (eventData.type === 'connection') {
        isConnecting.value = false;
        isConnected.value = false;
      }
    });

    natsService.addEventListener('message', () => {
      connectionStats.value.totalMessages++;
    });

    natsService.addEventListener('subscribed', () => {
      connectionStats.value.subscriptionsCount++;
    });

    natsService.addEventListener('unsubscribed', () => {
      connectionStats.value.subscriptionsCount = Math.max(0, connectionStats.value.subscriptionsCount - 1);
    });
  }

  /**
   * Validate connection configuration
   * @param {Object} config - Configuration to validate
   */
  function validateConnectionConfig(config) {
    if (!config) {
      throw new Error('Configuration is required');
    }

    if (!config.servers || !Array.isArray(config.servers) || config.servers.length === 0) {
      throw new Error('At least one server URL is required');
    }

    if (!config.authType || !['userpass', 'creds', 'none'].includes(config.authType)) {
      throw new Error('Valid authentication type is required (userpass, creds, or none)');
    }

    if (config.authType === 'userpass' && (!config.username || !config.password)) {
      throw new Error('Username and password are required for userpass authentication');
    }

    if (config.authType === 'creds' && !config.credsContent) {
      throw new Error('Credentials content is required for creds authentication');
    }

    // Validate server URLs
    config.servers.forEach((server, index) => {
      try {
        new URL(server);
      } catch {
        throw new Error(`Invalid server URL at index ${index}: ${server}`);
      }
    });
  }

  /**
   * Sanitize configuration for storage/display (remove sensitive data)
   * @param {Object} config - Configuration to sanitize
   * @returns {Object} Sanitized configuration
   */
  function sanitizeConfig(config) {
    if (!config) return null;
    
    const sanitized = { ...config };
    
    // Remove sensitive information
    if (sanitized.password) {
      sanitized.password = '[REDACTED]';
    }
    if (sanitized.credsContent) {
      sanitized.credsContent = '[REDACTED]';
    }
    
    return sanitized;
  }

  /**
   * Generate unique configuration ID
   * @returns {string} Unique ID
   */
  function generateConfigId() {
    return `config_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Return store interface
  return {
    // State
    isConnected,
    isConnecting,
    connectionError,
    lastConnectionAttempt,
    currentConfig,
    savedConfigs,
    connectionStats,
    
    // Computed
    connectionStatus,
    canConnect,
    canDisconnect,
    connectionStatusText,
    
    // Actions
    initialize,
    connect,
    disconnect,
    reconnect,
    testConnection,
    addToSavedConfigs,
    removeSavedConfig,
    loadSavedConfigs,
    clearSavedConfigs,
    getConnectionInfo
  };
});

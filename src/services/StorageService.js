import { BaseService } from './BaseService.js';

/**
 * Storage service for managing localStorage operations
 * Provides type-safe storage with error handling and data validation
 */
export class StorageService extends BaseService {
  constructor() {
    super('StorageService');
    
    // Storage key prefixes
    this.PREFIX = 'nats_dashboard_';
    
    // Storage keys
    this.KEYS = {
      CONNECTION_CONFIG: 'connection_config',
      DASHBOARD_CONFIG: 'dashboard_config',
      USER_PREFERENCES: 'user_preferences',
      CARD_CONFIGS: 'card_configs'
    };
  }

  /**
   * Generate full storage key with prefix
   * @param {string} key - Storage key
   * @returns {string} Prefixed key
   * @private
   */
  _getKey(key) {
    return `${this.PREFIX}${key}`;
  }

  /**
   * Store data in localStorage
   * @param {string} key - Storage key
   * @param {any} data - Data to store
   * @returns {boolean} Success status
   */
  setItem(key, data) {
    try {
      const serializedData = JSON.stringify(data);
      localStorage.setItem(this._getKey(key), serializedData);
      
      this.log(`Stored data for key: ${key}`, 'info', { 
        key, 
        dataSize: serializedData.length 
      });
      return true;
    } catch (error) {
      this.handleError(error, `setItem(${key})`);
      return false;
    }
  }

  /**
   * Retrieve data from localStorage
   * @param {string} key - Storage key
   * @param {any} defaultValue - Default value if key doesn't exist
   * @returns {any} Retrieved data or default value
   */
  getItem(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(this._getKey(key));
      
      if (item === null) {
        this.log(`No data found for key: ${key}`, 'info');
        return defaultValue;
      }

      const parsedData = JSON.parse(item);
      this.log(`Retrieved data for key: ${key}`, 'info');
      return parsedData;
    } catch (error) {
      this.handleError(error, `getItem(${key})`);
      return defaultValue;
    }
  }

  /**
   * Remove item from localStorage
   * @param {string} key - Storage key
   * @returns {boolean} Success status
   */
  removeItem(key) {
    try {
      localStorage.removeItem(this._getKey(key));
      this.log(`Removed data for key: ${key}`);
      return true;
    } catch (error) {
      this.handleError(error, `removeItem(${key})`);
      return false;
    }
  }

  /**
   * Check if key exists in localStorage
   * @param {string} key - Storage key
   * @returns {boolean} Existence status
   */
  hasItem(key) {
    try {
      return localStorage.getItem(this._getKey(key)) !== null;
    } catch (error) {
      this.handleError(error, `hasItem(${key})`);
      return false;
    }
  }

  /**
   * Clear all application data from localStorage
   * @returns {boolean} Success status
   */
  clearAll() {
    try {
      const keys = Object.keys(localStorage).filter(key => 
        key.startsWith(this.PREFIX)
      );
      
      keys.forEach(key => localStorage.removeItem(key));
      
      this.log(`Cleared ${keys.length} items from storage`);
      return true;
    } catch (error) {
      this.handleError(error, 'clearAll');
      return false;
    }
  }

  /**
   * Get storage usage information
   * @returns {Object} Storage usage stats
   */
  getStorageInfo() {
    try {
      const keys = Object.keys(localStorage).filter(key => 
        key.startsWith(this.PREFIX)
      );
      
      let totalSize = 0;
      const itemsInfo = keys.map(key => {
        const value = localStorage.getItem(key);
        const size = value ? value.length : 0;
        totalSize += size;
        
        return {
          key: key.replace(this.PREFIX, ''),
          size,
          hasData: value !== null
        };
      });

      return {
        totalItems: keys.length,
        totalSize,
        items: itemsInfo,
        isSupported: this.isStorageSupported()
      };
    } catch (error) {
      this.handleError(error, 'getStorageInfo');
      return {
        totalItems: 0,
        totalSize: 0,
        items: [],
        isSupported: false
      };
    }
  }

  /**
   * Check if localStorage is supported and available
   * @returns {boolean} Support status
   */
  isStorageSupported() {
    try {
      const testKey = '__storage_test__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }

  // Convenience methods for specific data types

  /**
   * Store connection configuration
   * @param {Object} config - Connection configuration
   * @returns {boolean} Success status
   */
  setConnectionConfig(config) {
    if (!config || typeof config !== 'object') {
      this.log('Invalid connection config provided', 'warn');
      return false;
    }

    return this.setItem(this.KEYS.CONNECTION_CONFIG, {
      ...config,
      timestamp: Date.now()
    });
  }

  /**
   * Get connection configuration
   * @returns {Object|null} Connection configuration
   */
  getConnectionConfig() {
    return this.getItem(this.KEYS.CONNECTION_CONFIG);
  }

  /**
   * Store dashboard configuration
   * @param {Object} config - Dashboard configuration
   * @returns {boolean} Success status
   */
  setDashboardConfig(config) {
    if (!config || typeof config !== 'object') {
      this.log('Invalid dashboard config provided', 'warn');
      return false;
    }

    return this.setItem(this.KEYS.DASHBOARD_CONFIG, {
      ...config,
      timestamp: Date.now()
    });
  }

  /**
   * Get dashboard configuration
   * @returns {Object|null} Dashboard configuration
   */
  getDashboardConfig() {
    return this.getItem(this.KEYS.DASHBOARD_CONFIG);
  }

  /**
   * Store user preferences
   * @param {Object} preferences - User preferences
   * @returns {boolean} Success status
   */
  setUserPreferences(preferences) {
    if (!preferences || typeof preferences !== 'object') {
      this.log('Invalid user preferences provided', 'warn');
      return false;
    }

    return this.setItem(this.KEYS.USER_PREFERENCES, {
      ...preferences,
      timestamp: Date.now()
    });
  }

  /**
   * Get user preferences
   * @returns {Object} User preferences with defaults
   */
  getUserPreferences() {
    const defaults = {
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
    };

    const stored = this.getItem(this.KEYS.USER_PREFERENCES);
    return stored ? { ...defaults, ...stored } : defaults;
  }

  /**
   * Update specific user preference
   * @param {string} key - Preference key
   * @param {any} value - Preference value
   * @returns {boolean} Success status
   */
  updateUserPreference(key, value) {
    const preferences = this.getUserPreferences();
    preferences[key] = value;
    return this.setUserPreferences(preferences);
  }

  /**
   * Store card configurations
   * @param {Object} cardConfigs - Card configurations by ID
   * @returns {boolean} Success status
   */
  setCardConfigs(cardConfigs) {
    if (!cardConfigs || typeof cardConfigs !== 'object') {
      this.log('Invalid card configs provided', 'warn');
      return false;
    }

    return this.setItem(this.KEYS.CARD_CONFIGS, {
      configs: cardConfigs,
      timestamp: Date.now()
    });
  }

  /**
   * Get card configurations
   * @returns {Object} Card configurations
   */
  getCardConfigs() {
    const stored = this.getItem(this.KEYS.CARD_CONFIGS);
    return stored?.configs || {};
  }

  /**
   * Export all configuration data
   * @returns {Object} Exportable configuration data
   */
  exportConfig() {
    try {
      return {
        dashboard: this.getDashboardConfig(),
        cards: this.getCardConfigs(),
        preferences: this.getUserPreferences(),
        exportTimestamp: Date.now(),
        version: '1.0.0'
      };
    } catch (error) {
      this.handleError(error, 'exportConfig');
      return null;
    }
  }

  /**
   * Import configuration data
   * @param {Object} config - Configuration data to import
   * @returns {boolean} Success status
   */
  importConfig(config) {
    if (!config || typeof config !== 'object') {
      this.log('Invalid config data for import', 'warn');
      return false;
    }

    try {
      let importCount = 0;

      if (config.dashboard) {
        this.setDashboardConfig(config.dashboard);
        importCount++;
      }

      if (config.cards) {
        this.setCardConfigs(config.cards);
        importCount++;
      }

      if (config.preferences) {
        this.setUserPreferences(config.preferences);
        importCount++;
      }

      this.log(`Successfully imported ${importCount} configuration sections`);
      return true;
    } catch (error) {
      this.handleError(error, 'importConfig');
      return false;
    }
  }
}

// Export singleton instance
export default new StorageService();

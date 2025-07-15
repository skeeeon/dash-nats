import { connect, StringCodec, credsAuthenticator } from 'nats.ws';
import { BaseService } from './BaseService.js';

/**
 * NATS service for managing WebSocket connections, publishing, and subscribing
 * Handles authentication, reconnection, and subscription management
 */
export class NatsService extends BaseService {
  constructor() {
    super('NatsService');
    
    // Connection state
    this.connection = null;
    this.isConnected = false;
    this.isConnecting = false;
    this.connectionConfig = null;
    
    // Subscriptions management
    this.subscriptions = new Map();
    this.subscriptionCallbacks = new Map();
    
    // Codecs
    this.stringCodec = StringCodec();
    
    // Event listeners
    this.eventListeners = new Map();
  }

  /**
   * Connect to NATS server with provided configuration
   * @param {Object} config - Connection configuration
   * @param {string[]} config.servers - NATS server URLs
   * @param {string} config.authType - Authentication type ('userpass' or 'creds')
   * @param {string} config.username - Username (for userpass auth)
   * @param {string} config.password - Password (for userpass auth)
   * @param {string} config.credsContent - Credentials content (for creds auth)
   * @param {Object} config.options - Additional connection options
   */
  async connect(config) {
    if (this.isConnecting) {
      throw new Error('Connection already in progress');
    }

    if (this.isConnected) {
      this.log('Already connected, disconnecting first');
      await this.disconnect();
    }

    this.validateParams(config, ['servers', 'authType']);
    
    try {
      this.isConnecting = true;
      this.connectionConfig = config;
      
      this.log('Attempting connection', 'info', this.sanitizeForLogging(config));
      
      const connectionOptions = {
        servers: config.servers,
        reconnect: config.options?.reconnect ?? true,
        maxReconnectAttempts: config.options?.maxReconnectAttempts ?? 10,
        reconnectTimeWait: config.options?.reconnectTimeWait ?? 2000,
        ...this._buildAuthOptions(config)
      };

      this.connection = await connect(connectionOptions);
      this.isConnected = true;
      this.isConnecting = false;

      // Setup connection event handlers
      this._setupConnectionEventHandlers();
      
      this.log('Successfully connected to NATS');
      this._emitEvent('connected', { config: this.sanitizeForLogging(config) });
      
      return true;
    } catch (error) {
      this.isConnecting = false;
      this.isConnected = false;
      this.connection = null;
      
      const errorInfo = this.handleError(error, 'connect');
      this._emitEvent('error', { type: 'connection', error: errorInfo });
      throw error;
    }
  }

  /**
   * Disconnect from NATS server
   */
  async disconnect() {
    if (!this.connection) {
      return;
    }

    try {
      this.log('Disconnecting from NATS');
      
      // Clean up all subscriptions
      await this.unsubscribeAll();
      
      // Close connection
      await this.connection.close();
      
      this.connection = null;
      this.isConnected = false;
      this.connectionConfig = null;
      
      this.log('Successfully disconnected');
      this._emitEvent('disconnected');
    } catch (error) {
      this.handleError(error, 'disconnect');
      throw error;
    }
  }

  /**
   * Publish a message to a topic
   * @param {string} topic - NATS subject/topic
   * @param {Object|string} payload - Message payload
   */
  async publish(topic, payload) {
    if (!this.isConnected || !this.connection) {
      throw new Error('Not connected to NATS server');
    }

    this.validateParams({ topic }, ['topic']);

    try {
      const message = typeof payload === 'string' 
        ? payload 
        : JSON.stringify(payload);
        
      this.connection.publish(topic, this.stringCodec.encode(message));
      
      this.log(`Published to ${topic}`, 'info', { topic, payloadSize: message.length });
      this._emitEvent('published', { topic, payload, timestamp: Date.now() });
    } catch (error) {
      const errorInfo = this.handleError(error, 'publish');
      this._emitEvent('error', { type: 'publish', error: errorInfo, topic });
      throw error;
    }
  }

  /**
   * Subscribe to a topic
   * @param {string} topic - NATS subject/topic
   * @param {Function} callback - Message callback function
   * @returns {string} Subscription ID
   */
  async subscribe(topic, callback) {
    if (!this.isConnected || !this.connection) {
      throw new Error('Not connected to NATS server');
    }

    this.validateParams({ topic, callback }, ['topic', 'callback']);

    try {
      const subscription = this.connection.subscribe(topic);
      const subscriptionId = `${topic}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      this.subscriptions.set(subscriptionId, subscription);
      this.subscriptionCallbacks.set(subscriptionId, callback);
      
      // Handle incoming messages
      this._handleSubscription(subscription, topic, callback, subscriptionId);
      
      this.log(`Subscribed to ${topic}`, 'info', { subscriptionId });
      this._emitEvent('subscribed', { topic, subscriptionId });
      
      return subscriptionId;
    } catch (error) {
      const errorInfo = this.handleError(error, 'subscribe');
      this._emitEvent('error', { type: 'subscribe', error: errorInfo, topic });
      throw error;
    }
  }

  /**
   * Unsubscribe from a topic
   * @param {string} subscriptionId - Subscription ID returned from subscribe
   */
  async unsubscribe(subscriptionId) {
    const subscription = this.subscriptions.get(subscriptionId);
    
    if (!subscription) {
      this.log(`Subscription ${subscriptionId} not found`, 'warn');
      return;
    }

    try {
      subscription.unsubscribe();
      
      this.subscriptions.delete(subscriptionId);
      this.subscriptionCallbacks.delete(subscriptionId);
      
      this.log(`Unsubscribed ${subscriptionId}`);
      this._emitEvent('unsubscribed', { subscriptionId });
    } catch (error) {
      this.handleError(error, 'unsubscribe');
      throw error;
    }
  }

  /**
   * Unsubscribe from all topics
   */
  async unsubscribeAll() {
    const subscriptionIds = Array.from(this.subscriptions.keys());
    
    for (const subscriptionId of subscriptionIds) {
      try {
        await this.unsubscribe(subscriptionId);
      } catch (error) {
        this.log(`Error unsubscribing ${subscriptionId}`, 'error', error);
      }
    }
    
    this.log(`Unsubscribed from ${subscriptionIds.length} subscriptions`);
  }

  /**
   * Get current connection status
   * @returns {Object} Connection status information
   */
  getStatus() {
    return {
      isConnected: this.isConnected,
      isConnecting: this.isConnecting,
      subscriptionCount: this.subscriptions.size,
      config: this.connectionConfig ? this.sanitizeForLogging(this.connectionConfig) : null
    };
  }

  /**
   * Add event listener
   * @param {string} event - Event name
   * @param {Function} listener - Event listener function
   */
  addEventListener(event, listener) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event).add(listener);
  }

  /**
   * Remove event listener
   * @param {string} event - Event name
   * @param {Function} listener - Event listener function
   */
  removeEventListener(event, listener) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.delete(listener);
    }
  }

  /**
   * Build authentication options based on config
   * @private
   */
  _buildAuthOptions(config) {
    const authOptions = {};

    if (config.authType === 'userpass') {
      if (config.username && config.password) {
        authOptions.user = config.username;
        authOptions.pass = config.password;
      }
    } else if (config.authType === 'creds') {
      if (config.credsContent) {
        authOptions.authenticator = credsAuthenticator(
          new TextEncoder().encode(config.credsContent)
        );
      }
    }

    return authOptions;
  }

  /**
   * Setup connection event handlers
   * @private
   */
  _setupConnectionEventHandlers() {
    if (!this.connection) return;

    // Handle connection closed
    this.connection.closed().then(() => {
      this.log('Connection closed');
      this.isConnected = false;
      this._emitEvent('disconnected');
    }).catch((error) => {
      this.log('Connection closed with error', 'error', error);
      this.isConnected = false;
      this._emitEvent('error', { type: 'connection_closed', error });
    });
  }

  /**
   * Handle subscription messages
   * @private
   */
  async _handleSubscription(subscription, topic, callback, subscriptionId) {
    try {
      for await (const message of subscription) {
        try {
          const decodedMessage = this.stringCodec.decode(message.data);
          let parsedMessage;

          // Try to parse as JSON, fallback to string
          try {
            parsedMessage = JSON.parse(decodedMessage);
          } catch {
            parsedMessage = decodedMessage;
          }

          const messageData = {
            topic: message.subject,
            payload: parsedMessage,
            timestamp: Date.now(),
            subscriptionId
          };

          await callback(messageData);
          this._emitEvent('message', messageData);
        } catch (error) {
          this.handleError(error, `subscription_message_${topic}`);
        }
      }
    } catch (error) {
      this.handleError(error, `subscription_${topic}`);
      this._emitEvent('error', { 
        type: 'subscription', 
        error: this.handleError(error, 'subscription'),
        topic,
        subscriptionId 
      });
    }
  }

  /**
   * Emit event to all listeners
   * @private
   */
  _emitEvent(event, data = null) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(data);
        } catch (error) {
          this.log(`Error in event listener for ${event}`, 'error', error);
        }
      });
    }
  }

  /**
   * Cleanup service resources
   */
  async cleanup() {
    try {
      await this.disconnect();
      this.eventListeners.clear();
    } catch (error) {
      this.handleError(error, 'cleanup');
    }
    
    await super.cleanup();
  }
}

// Export singleton instance
export default new NatsService();

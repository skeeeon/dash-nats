/**
 * Base service class that provides common functionality for all services
 * Implements error handling, logging, and common utilities
 */
export class BaseService {
  constructor(name = 'BaseService') {
    this.serviceName = name;
    this.isInitialized = false;
  }

  /**
   * Initialize the service
   * Override in child classes for specific initialization logic
   */
  async initialize() {
    if (this.isInitialized) {
      return;
    }
    
    this.log('Initializing service');
    this.isInitialized = true;
  }

  /**
   * Cleanup service resources
   * Override in child classes for specific cleanup logic
   */
  async cleanup() {
    this.log('Cleaning up service');
    this.isInitialized = false;
  }

  /**
   * Log service messages with service name prefix
   * @param {string} message - Log message
   * @param {string} level - Log level (info, warn, error)
   * @param {any} data - Additional data to log
   */
  log(message, level = 'info', data = null) {
    const prefix = `[${this.serviceName}]`;
    
    switch (level) {
      case 'warn':
        console.warn(prefix, message, data || '');
        break;
      case 'error':
        console.error(prefix, message, data || '');
        break;
      default:
        console.log(prefix, message, data || '');
    }
  }

  /**
   * Handle and log errors consistently
   * @param {Error} error - Error object
   * @param {string} context - Context where error occurred
   * @returns {Object} Formatted error object
   */
  handleError(error, context = 'Unknown') {
    const errorInfo = {
      message: error.message || 'Unknown error',
      context,
      timestamp: new Date().toISOString(),
      stack: error.stack
    };

    this.log(`Error in ${context}: ${errorInfo.message}`, 'error', errorInfo);
    return errorInfo;
  }

  /**
   * Validate required parameters
   * @param {Object} params - Parameters to validate
   * @param {string[]} required - Required parameter names
   * @throws {Error} If required parameters are missing
   */
  validateParams(params, required = []) {
    const missing = required.filter(key => 
      params[key] === undefined || params[key] === null
    );

    if (missing.length > 0) {
      throw new Error(`Missing required parameters: ${missing.join(', ')}`);
    }
  }

  /**
   * Create a safe copy of an object, removing sensitive data
   * @param {Object} obj - Object to sanitize
   * @param {string[]} sensitiveKeys - Keys to remove
   * @returns {Object} Sanitized object
   */
  sanitizeForLogging(obj, sensitiveKeys = ['password', 'token', 'credentials']) {
    if (!obj || typeof obj !== 'object') return obj;

    const sanitized = { ...obj };
    sensitiveKeys.forEach(key => {
      if (sanitized[key]) {
        sanitized[key] = '[REDACTED]';
      }
    });

    return sanitized;
  }
}

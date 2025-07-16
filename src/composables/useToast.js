import { ref, reactive } from 'vue';

/**
 * Toast notification composable
 * Provides reactive toast notifications with auto-dismiss
 */

// Global toast state
const toasts = ref([]);
let toastIdCounter = 0;

/**
 * Create a toast notification
 * @param {string} message - Toast message
 * @param {string} type - Toast type (success, error, info, warning)
 * @param {number} duration - Auto-dismiss duration in ms (0 = no auto-dismiss)
 * @returns {string} Toast ID
 */
export function createToast(message, type = 'info', duration = 5000) {
  const id = `toast-${++toastIdCounter}`;
  
  const toast = reactive({
    id,
    message,
    type,
    duration,
    visible: true,
    dismissed: false,
    timestamp: Date.now()
  });
  
  toasts.value.push(toast);
  
  // Auto-dismiss if duration is set
  if (duration > 0) {
    setTimeout(() => {
      dismissToast(id);
    }, duration);
  }
  
  return id;
}

/**
 * Dismiss a toast by ID
 * @param {string} id - Toast ID
 */
export function dismissToast(id) {
  const toast = toasts.value.find(t => t.id === id);
  if (toast && !toast.dismissed) {
    toast.visible = false;
    toast.dismissed = true;
    
    // Remove from array after animation
    setTimeout(() => {
      const index = toasts.value.findIndex(t => t.id === id);
      if (index > -1) {
        toasts.value.splice(index, 1);
      }
    }, 300);
  }
}

/**
 * Clear all toasts
 */
export function clearAllToasts() {
  toasts.value.forEach(toast => {
    toast.visible = false;
    toast.dismissed = true;
  });
  
  setTimeout(() => {
    toasts.value.splice(0);
  }, 300);
}

/**
 * Main toast composable
 * @returns {Object} Toast functions and state
 */
export function useToast() {
  /**
   * Show success toast
   * @param {string} message - Success message
   * @param {number} duration - Duration in ms
   */
  const success = (message, duration = 4000) => {
    return createToast(message, 'success', duration);
  };

  /**
   * Show error toast
   * @param {string} message - Error message
   * @param {number} duration - Duration in ms (0 = no auto-dismiss for errors)
   */
  const error = (message, duration = 0) => {
    return createToast(message, 'error', duration);
  };

  /**
   * Show info toast
   * @param {string} message - Info message
   * @param {number} duration - Duration in ms
   */
  const info = (message, duration = 3000) => {
    return createToast(message, 'info', duration);
  };

  /**
   * Show warning toast
   * @param {string} message - Warning message
   * @param {number} duration - Duration in ms
   */
  const warning = (message, duration = 4000) => {
    return createToast(message, 'warning', duration);
  };

  /**
   * Show loading toast
   * @param {string} message - Loading message
   * @returns {string} Toast ID for manual dismissal
   */
  const loading = (message) => {
    return createToast(message, 'loading', 0);
  };

  /**
   * Update existing toast
   * @param {string} id - Toast ID
   * @param {string} message - New message
   * @param {string} type - New type
   */
  const update = (id, message, type = 'info') => {
    const toast = toasts.value.find(t => t.id === id);
    if (toast) {
      toast.message = message;
      toast.type = type;
      
      // Auto-dismiss updated toast if it's not loading or error
      if (type !== 'loading' && type !== 'error') {
        setTimeout(() => {
          dismissToast(id);
        }, 3000);
      }
    }
  };

  return {
    toasts,
    success,
    error,
    info,
    warning,
    loading,
    update,
    dismiss: dismissToast,
    clear: clearAllToasts
  };
}

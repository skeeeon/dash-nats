import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';

// Import global styles
import './style.css';

/**
 * NATS Dashboard Application Entry Point
 * 
 * This file initializes the Vue 3 application with all necessary
 * plugins, stores, and global configurations.
 */

console.log('🚀 Initializing NATS Dashboard...');

// Create Vue application instance
const app = createApp(App);

// Create Pinia store instance
const pinia = createPinia();

// Install plugins
app.use(pinia);
app.use(router);

// Global error handler
app.config.errorHandler = (error, instance, info) => {
  console.error('Vue error:', error);
  console.error('Component:', instance);
  console.error('Error info:', info);
  
  // In production, you might want to send this to an error reporting service
  if (import.meta.env.PROD) {
    // Example: Sentry, LogRocket, etc.
    // errorReportingService.captureException(error, { extra: { info } });
  }
};

// Global warning handler (development only)
if (import.meta.env.DEV) {
  app.config.warnHandler = (msg, instance, trace) => {
    console.warn('Vue warning:', msg);
    console.warn('Component:', instance);
    console.warn('Trace:', trace);
  };
}

// Global properties (if needed)
app.config.globalProperties.$appVersion = '1.0.0';
app.config.globalProperties.$buildDate = new Date().toISOString();

// Performance monitoring
if (import.meta.env.DEV) {
  app.config.performance = true;
}

// Mount application
app.mount('#app');

// Application initialization logging
console.log('✅ NATS Dashboard initialized successfully');
console.log('📊 Environment:', import.meta.env.MODE);
console.log('🔧 Vue version:', app.version);

// Service worker registration (for PWA - Phase 5)
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('✅ SW registered: ', registration);
      })
      .catch((registrationError) => {
        console.log('❌ SW registration failed: ', registrationError);
      });
  });
}

// Expose development helpers in development mode
if (import.meta.env.DEV) {
  window.__NATS_DASHBOARD__ = {
    app,
    router,
    pinia,
    // Add development helpers here
    clearStorage: () => {
      localStorage.clear();
      sessionStorage.clear();
      console.log('🧹 Storage cleared');
    },
    reload: () => {
      window.location.reload();
    }
  };
  
  console.log('🛠️ Development helpers available at window.__NATS_DASHBOARD__');
}

// Global keyboard shortcuts
document.addEventListener('keydown', (event) => {
  // Ctrl/Cmd + K for quick actions (future feature)
  if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
    event.preventDefault();
    console.log('Quick actions shortcut pressed');
    // TODO: Implement quick actions modal in future phases
  }
  
  // Ctrl/Cmd + / for help (future feature)
  if ((event.ctrlKey || event.metaKey) && event.key === '/') {
    event.preventDefault();
    console.log('Help shortcut pressed');
    // TODO: Implement help modal in future phases
  }
});

// Unhandled promise rejection handler
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  
  // Prevent the default browser behavior
  event.preventDefault();
  
  // In production, report to error service
  if (import.meta.env.PROD) {
    // errorReportingService.captureException(event.reason);
  }
});

// Online/offline detection
window.addEventListener('online', () => {
  console.log('🌐 Application is online');
});

window.addEventListener('offline', () => {
  console.log('📱 Application is offline');
});

// Page visibility API for performance optimization
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    console.log('👻 Application hidden');
    // Pause expensive operations
  } else {
    console.log('👀 Application visible');
    // Resume operations
  }
});

// Memory usage monitoring (development only)
if (import.meta.env.DEV && 'memory' in performance) {
  setInterval(() => {
    const memory = performance.memory;
    if (memory.usedJSHeapSize > 50 * 1024 * 1024) { // 50MB threshold
      console.warn('🧠 High memory usage detected:', {
        used: `${Math.round(memory.usedJSHeapSize / 1024 / 1024)}MB`,
        total: `${Math.round(memory.totalJSHeapSize / 1024 / 1024)}MB`,
        limit: `${Math.round(memory.jsHeapSizeLimit / 1024 / 1024)}MB`
      });
    }
  }, 30000); // Check every 30 seconds
}

export default app;

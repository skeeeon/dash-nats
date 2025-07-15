<template>
  <div id="app">
    <!-- Main Application Layout -->
    <AppLayout>
      <!-- Router View - renders the current page component -->
      <RouterView />
    </AppLayout>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted } from 'vue';
import AppLayout from '@/components/common/AppLayout.vue';
import { useConnectionStore } from '@/stores/connection.js';

// Initialize connection store
const connectionStore = useConnectionStore();

// Lifecycle hooks
onMounted(() => {
  console.log('NATS Dashboard initialized');
  
  // Initialize connection store
  connectionStore.initialize();
  
  // Add global error handler
  window.addEventListener('error', handleGlobalError);
  window.addEventListener('unhandledrejection', handleUnhandledRejection);
  
  // Add visibility change handler for connection management
  document.addEventListener('visibilitychange', handleVisibilityChange);
});

onUnmounted(() => {
  console.log('NATS Dashboard cleanup');
  
  // Remove global error handlers
  window.removeEventListener('error', handleGlobalError);
  window.removeEventListener('unhandledrejection', handleUnhandledRejection);
  document.removeEventListener('visibilitychange', handleVisibilityChange);
});

// Global error handling
function handleGlobalError(event) {
  console.error('Global error:', event.error);
  
  // In a production app, you might want to send errors to a logging service
  // For now, we'll just log them
}

function handleUnhandledRejection(event) {
  console.error('Unhandled promise rejection:', event.reason);
  
  // Prevent the default browser behavior of logging the error to console
  event.preventDefault();
}

// Handle browser visibility changes
function handleVisibilityChange() {
  if (document.hidden) {
    console.log('App became hidden');
    // Optionally pause certain operations when app is hidden
  } else {
    console.log('App became visible');
    // Optionally resume operations when app becomes visible
  }
}
</script>

<style>
/* Global application styles */

/* Import Tailwind CSS */
@import 'tailwindcss/base';
@import 'tailwindcss/components';
@import 'tailwindcss/utilities';

/* Custom CSS variables for theming */
:root {
  /* Light theme colors */
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --card: 0 0% 100%;
  --card-foreground: 222.2 84% 4.9%;
  --popover: 0 0% 100%;
  --popover-foreground: 222.2 84% 4.9%;
  --primary: 222.2 47.4% 11.2%;
  --primary-foreground: 210 40% 98%;
  --secondary: 210 40% 96%;
  --secondary-foreground: 222.2 84% 4.9%;
  --muted: 210 40% 96%;
  --muted-foreground: 215.4 16.3% 46.9%;
  --accent: 210 40% 96%;
  --accent-foreground: 222.2 84% 4.9%;
  --destructive: 0 84.2% 60.2%;
  --destructive-foreground: 210 40% 98%;
  --border: 214.3 31.8% 91.4%;
  --input: 214.3 31.8% 91.4%;
  --ring: 222.2 84% 4.9%;
  --radius: 0.5rem;
}

.dark {
  /* Dark theme colors */
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  --card: 222.2 84% 4.9%;
  --card-foreground: 210 40% 98%;
  --popover: 222.2 84% 4.9%;
  --popover-foreground: 210 40% 98%;
  --primary: 210 40% 98%;
  --primary-foreground: 222.2 47.4% 11.2%;
  --secondary: 217.2 32.6% 17.5%;
  --secondary-foreground: 210 40% 98%;
  --muted: 217.2 32.6% 17.5%;
  --muted-foreground: 215 20.2% 65.1%;
  --accent: 217.2 32.6% 17.5%;
  --accent-foreground: 210 40% 98%;
  --destructive: 0 62.8% 30.6%;
  --destructive-foreground: 210 40% 98%;
  --border: 217.2 32.6% 17.5%;
  --input: 217.2 32.6% 17.5%;
  --ring: 212.7 26.8% 83.9%;
}

/* Base styles */
* {
  border-color: hsl(var(--border));
}

body {
  background-color: hsl(var(--background));
  color: hsl(var(--foreground));
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* Ensure full height */
html, body, #app {
  height: 100%;
  margin: 0;
  padding: 0;
}

/* Custom scrollbar styling */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: hsl(var(--background));
}

::-webkit-scrollbar-thumb {
  background: hsl(var(--border));
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: hsl(var(--muted-foreground));
}

/* Focus styles for accessibility */
:focus-visible {
  outline: 2px solid hsl(var(--primary));
  outline-offset: 2px;
}

/* Disable focus outline for mouse users */
:focus:not(:focus-visible) {
  outline: none;
}

/* Animation utilities */
@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes slideIn {
  from {
    transform: translateX(-100%);
  }
  to {
    transform: translateX(0);
  }
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.fade-in {
  animation: fadeIn 0.3s ease-out;
}

.slide-in {
  animation: slideIn 0.3s ease-out;
}

/* Utility classes */
.text-balance {
  text-wrap: balance;
}

.transition-all {
  transition: all 0.2s ease-in-out;
}

/* Print styles */
@media print {
  .no-print {
    display: none !important;
  }
  
  body {
    background: white !important;
    color: black !important;
  }
}

/* High contrast mode support */
@media (prefers-contrast: high) {
  :root {
    --border: 0 0% 0%;
    --input: 0 0% 0%;
  }
  
  .dark {
    --border: 0 0% 100%;
    --input: 0 0% 100%;
  }
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}

/* Mobile-specific styles */
@media (max-width: 768px) {
  body {
    font-size: 14px;
  }
  
  /* Improve touch targets */
  button,
  input,
  select,
  textarea {
    min-height: 44px;
  }
}
</style>

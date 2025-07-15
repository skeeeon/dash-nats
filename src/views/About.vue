<template>
  <div class="h-full overflow-auto">
    <div class="max-w-4xl mx-auto p-6">
      <!-- Header -->
      <div class="text-center mb-12">
        <div class="inline-flex items-center justify-center w-20 h-20 bg-primary/10 rounded-full mb-6">
          <svg class="w-10 h-10 text-primary" fill="currentColor" viewBox="0 0 24 24">
            <path d="M3 3h18v18H3V3zm2 2v14h14V5H5zm2 2h10v2H7V7zm0 4h10v2H7v-2zm0 4h7v2H7v-2z"/>
          </svg>
        </div>
        <h1 class="text-4xl font-bold text-foreground mb-4">NATS Dashboard</h1>
        <p class="text-xl text-muted-foreground max-w-2xl mx-auto">
          A modern, web-based dashboard for monitoring and interacting with NATS messaging systems
        </p>
        <div class="mt-4">
          <span class="inline-block px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">
            Version {{ version }}
          </span>
        </div>
      </div>

      <div class="space-y-12">
        <!-- Features -->
        <section>
          <h2 class="text-2xl font-bold text-foreground mb-6">Features</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div class="p-6 bg-card border border-border rounded-lg">
              <div class="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center mb-4">
                <svg class="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h3 class="text-lg font-semibold text-foreground mb-2">Real-time Messaging</h3>
              <p class="text-muted-foreground text-sm">
                Publish and subscribe to NATS topics with real-time message updates and live data streaming.
              </p>
            </div>

            <div class="p-6 bg-card border border-border rounded-lg">
              <div class="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mb-4">
                <svg class="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                </svg>
              </div>
              <h3 class="text-lg font-semibold text-foreground mb-2">Drag & Drop Interface</h3>
              <p class="text-muted-foreground text-sm">
                Intuitive dashboard with drag-and-drop cards that can be resized and repositioned to fit your workflow.
              </p>
            </div>

            <div class="p-6 bg-card border border-border rounded-lg">
              <div class="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center mb-4">
                <svg class="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 class="text-lg font-semibold text-foreground mb-2">Data Visualization</h3>
              <p class="text-muted-foreground text-sm">
                Transform NATS messages into interactive charts and graphs with real-time data visualization capabilities.
              </p>
            </div>

            <div class="p-6 bg-card border border-border rounded-lg">
              <div class="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center mb-4">
                <svg class="w-6 h-6 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 class="text-lg font-semibold text-foreground mb-2">Secure Authentication</h3>
              <p class="text-muted-foreground text-sm">
                Support for multiple authentication methods including username/password and JWT credentials.
              </p>
            </div>

            <div class="p-6 bg-card border border-border rounded-lg">
              <div class="w-12 h-12 bg-teal-100 dark:bg-teal-900/30 rounded-lg flex items-center justify-center mb-4">
                <svg class="w-6 h-6 text-teal-600 dark:text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 class="text-lg font-semibold text-foreground mb-2">Responsive Design</h3>
              <p class="text-muted-foreground text-sm">
                Fully responsive interface that works seamlessly across desktop, tablet, and mobile devices.
              </p>
            </div>

            <div class="p-6 bg-card border border-border rounded-lg">
              <div class="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center mb-4">
                <svg class="w-6 h-6 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                </svg>
              </div>
              <h3 class="text-lg font-semibold text-foreground mb-2">Export & Import</h3>
              <p class="text-muted-foreground text-sm">
                Export dashboard configurations and import them across different environments for easy setup.
              </p>
            </div>
          </div>
        </section>

        <!-- Technology Stack -->
        <section>
          <h2 class="text-2xl font-bold text-foreground mb-6">Built With</h2>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div class="p-4 bg-card border border-border rounded-lg text-center">
              <div class="text-2xl mb-2">⚡</div>
              <div class="font-medium text-foreground">Vue 3</div>
              <div class="text-xs text-muted-foreground">Frontend Framework</div>
            </div>
            <div class="p-4 bg-card border border-border rounded-lg text-center">
              <div class="text-2xl mb-2">🎨</div>
              <div class="font-medium text-foreground">Tailwind CSS</div>
              <div class="text-xs text-muted-foreground">Styling</div>
            </div>
            <div class="p-4 bg-card border border-border rounded-lg text-center">
              <div class="text-2xl mb-2">📡</div>
              <div class="font-medium text-foreground">NATS.ws</div>
              <div class="text-xs text-muted-foreground">WebSocket Client</div>
            </div>
            <div class="p-4 bg-card border border-border rounded-lg text-center">
              <div class="text-2xl mb-2">📊</div>
              <div class="font-medium text-foreground">GridStack</div>
              <div class="text-xs text-muted-foreground">Grid Layout</div>
            </div>
          </div>
        </section>

        <!-- Getting Started -->
        <section>
          <h2 class="text-2xl font-bold text-foreground mb-6">Getting Started</h2>
          <div class="bg-card border border-border rounded-lg p-6">
            <div class="space-y-4">
              <div class="flex items-start gap-4">
                <div class="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-semibold text-sm">
                  1
                </div>
                <div>
                  <h3 class="font-semibold text-foreground mb-1">Configure Connection</h3>
                  <p class="text-muted-foreground text-sm">
                    Start by configuring your NATS server connection in the Connection Settings page.
                  </p>
                </div>
              </div>
              
              <div class="flex items-start gap-4">
                <div class="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-semibold text-sm">
                  2
                </div>
                <div>
                  <h3 class="font-semibold text-foreground mb-1">Add Cards</h3>
                  <p class="text-muted-foreground text-sm">
                    Once connected, add publisher and subscriber cards to interact with your NATS topics.
                  </p>
                </div>
              </div>
              
              <div class="flex items-start gap-4">
                <div class="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-semibold text-sm">
                  3
                </div>
                <div>
                  <h3 class="font-semibold text-foreground mb-1">Customize Layout</h3>
                  <p class="text-muted-foreground text-sm">
                    Drag and resize cards to create the perfect dashboard layout for your needs.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- Support -->
        <section>
          <h2 class="text-2xl font-bold text-foreground mb-6">Support & Resources</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="p-6 bg-card border border-border rounded-lg">
              <h3 class="text-lg font-semibold text-foreground mb-3">NATS Documentation</h3>
              <p class="text-muted-foreground text-sm mb-4">
                Learn more about NATS messaging system and its capabilities.
              </p>
              <a
                href="https://docs.nats.io/"
                target="_blank"
                rel="noopener noreferrer"
                class="inline-flex items-center gap-2 text-primary hover:text-primary/80 font-medium"
              >
                Visit Documentation
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
            
            <div class="p-6 bg-card border border-border rounded-lg">
              <h3 class="text-lg font-semibold text-foreground mb-3">WebSocket Support</h3>
              <p class="text-muted-foreground text-sm mb-4">
                Information about NATS WebSocket connections and browser compatibility.
              </p>
              <a
                href="https://docs.nats.io/nats-concepts/connectivity/websockets"
                target="_blank"
                rel="noopener noreferrer"
                class="inline-flex items-center gap-2 text-primary hover:text-primary/80 font-medium"
              >
                WebSocket Guide
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          </div>
        </section>

        <!-- System Information -->
        <section>
          <h2 class="text-2xl font-bold text-foreground mb-6">System Information</h2>
          <div class="bg-card border border-border rounded-lg p-6">
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
              <div>
                <div class="text-muted-foreground">Version</div>
                <div class="font-semibold">{{ version }}</div>
              </div>
              <div>
                <div class="text-muted-foreground">Build Date</div>
                <div class="font-semibold">{{ buildDate }}</div>
              </div>
              <div>
                <div class="text-muted-foreground">Browser</div>
                <div class="font-semibold">{{ browserInfo }}</div>
              </div>
              <div>
                <div class="text-muted-foreground">WebSocket Support</div>
                <div class="font-semibold">{{ webSocketSupport ? 'Yes' : 'No' }}</div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';

// Application info
const version = ref('1.0.0');
const buildDate = ref(new Date().toLocaleDateString());

// System info
const browserInfo = computed(() => {
  const ua = navigator.userAgent;
  if (ua.includes('Chrome')) return 'Chrome';
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Safari')) return 'Safari';
  if (ua.includes('Edge')) return 'Edge';
  return 'Unknown';
});

const webSocketSupport = computed(() => {
  return 'WebSocket' in window;
});

// Methods
function detectSystemInfo() {
  // In a real application, you might want to detect more system information
  console.log('System Info:', {
    version: version.value,
    buildDate: buildDate.value,
    browser: browserInfo.value,
    webSocket: webSocketSupport.value,
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    language: navigator.language
  });
}

// Lifecycle
onMounted(() => {
  detectSystemInfo();
});
</script>

<style scoped>
/* Smooth scrolling for internal links */
html {
  scroll-behavior: smooth;
}

/* Custom gradient for hero section */
.hero-gradient {
  background: linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary)) 100%);
}
</style>

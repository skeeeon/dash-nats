<template>
  <div class="h-full flex flex-col">
    <!-- Dashboard Header -->
    <div class="flex-shrink-0 p-6 border-b border-border bg-background/95 backdrop-blur">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-foreground">{{ dashboardTitle }}</h1>
          <p class="text-muted-foreground mt-1">
            {{ isConnected ? 'Configure cards to start publishing and subscribing' : 'Connect to NATS to begin' }}
          </p>
        </div>
        
        <div class="flex items-center gap-3">
          <!-- Add Card Button -->
          <button
            v-if="isConnected"
            @click="showAddCard = true"
            class="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors font-medium"
          >
            + Add Card
          </button>
          
          <!-- Dashboard Actions -->
          <button
            @click="showDashboardMenu = !showDashboardMenu"
            class="p-2 hover:bg-accent rounded-md transition-colors"
            title="Dashboard options"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
    
    <!-- Main Dashboard Content -->
    <div class="flex-1 overflow-hidden">
      <!-- Connection Required State -->
      <div v-if="!isConnected" class="h-full flex items-center justify-center">
        <div class="text-center max-w-md mx-auto p-6">
          <div class="w-16 h-16 mx-auto mb-4 text-muted-foreground">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" 
                    d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
            </svg>
          </div>
          <h2 class="text-xl font-semibold text-foreground mb-2">Connect to NATS</h2>
          <p class="text-muted-foreground mb-4">
            You need to connect to a NATS server before you can use the dashboard.
          </p>
          <button
            @click="navigateToConnections"
            class="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors font-medium"
          >
            Configure Connection
          </button>
        </div>
      </div>
      
      <!-- Dashboard Grid (when connected) -->
      <div v-else class="h-full p-6">
        <div v-if="cards.length === 0" class="h-full flex items-center justify-center">
          <div class="text-center max-w-md mx-auto">
            <div class="w-16 h-16 mx-auto mb-4 text-muted-foreground">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" 
                      d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
              </svg>
            </div>
            <h2 class="text-xl font-semibold text-foreground mb-2">Empty Dashboard</h2>
            <p class="text-muted-foreground mb-4">
              Add your first card to start publishing and subscribing to NATS topics.
            </p>
            <button
              @click="showAddCard = true"
              class="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors font-medium"
            >
              + Add Your First Card
            </button>
          </div>
        </div>
        
        <!-- Cards Grid (placeholder for Phase 2) -->
        <div v-else class="h-full">
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <!-- Placeholder cards for Phase 1 -->
            <div
              v-for="card in cards"
              :key="card.id"
              class="p-6 bg-card border border-border rounded-lg shadow-sm hover:shadow-md transition-shadow"
            >
              <div class="flex items-center justify-between mb-3">
                <h3 class="font-semibold text-foreground">{{ card.title }}</h3>
                <span class="text-xs px-2 py-1 bg-secondary text-secondary-foreground rounded">
                  {{ card.type }}
                </span>
              </div>
              <p class="text-sm text-muted-foreground">
                {{ card.description }}
              </p>
              <div class="mt-4 pt-4 border-t border-border">
                <button class="text-sm text-primary hover:text-primary/80">
                  Configure →
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Add Card Modal (placeholder for Phase 2) -->
    <div
      v-if="showAddCard"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      @click.self="showAddCard = false"
    >
      <div class="bg-background border border-border rounded-lg p-6 max-w-md w-full mx-4">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold">Add Card</h3>
          <button
            @click="showAddCard = false"
            class="p-1 hover:bg-accent rounded"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div class="space-y-3">
          <button
            @click="addCard('publisher')"
            class="w-full p-4 text-left border border-border rounded-lg hover:bg-accent transition-colors"
          >
            <div class="font-medium">Publisher Card</div>
            <div class="text-sm text-muted-foreground">Send messages to NATS topics</div>
          </button>
          
          <button
            @click="addCard('subscriber')"
            class="w-full p-4 text-left border border-border rounded-lg hover:bg-accent transition-colors"
          >
            <div class="font-medium">Subscriber Card</div>
            <div class="text-sm text-muted-foreground">Receive messages from NATS topics</div>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useNatsConnection } from '@/composables/useNatsConnection.js';

// Composables
const route = useRoute();
const router = useRouter();
const { isConnected, connectionStatus } = useNatsConnection();

// Local state
const showAddCard = ref(false);
const showDashboardMenu = ref(false);
const cards = ref([]); // Placeholder for Phase 2

// Computed properties
const dashboardId = computed(() => route.params.id || 'default');
const dashboardTitle = computed(() => {
  if (dashboardId.value === 'default') {
    return 'Main Dashboard';
  }
  return `Dashboard ${dashboardId.value}`;
});

// Methods
function navigateToConnections() {
  router.push({ name: 'connections' });
}

function addCard(type) {
  // Placeholder implementation for Phase 1
  const newCard = {
    id: `card_${Date.now()}`,
    type,
    title: `${type.charAt(0).toUpperCase() + type.slice(1)} Card`,
    description: `A new ${type} card for NATS messaging`
  };
  
  cards.value.push(newCard);
  showAddCard.value = false;
  
  console.log(`Added ${type} card:`, newCard);
}

// Lifecycle
onMounted(() => {
  console.log(`Dashboard view mounted for: ${dashboardId.value}`);
  
  // Add some demo cards for Phase 1 testing
  if (isConnected.value) {
    cards.value = [
      {
        id: 'demo1',
        type: 'publisher',
        title: 'Temperature Sensor',
        description: 'Publish temperature readings to sensors.temp topic'
      },
      {
        id: 'demo2',
        type: 'subscriber',
        title: 'System Alerts',
        description: 'Listen for alerts on system.* topics'
      }
    ];
  }
});
</script>

<style scoped>
/* Smooth transitions for modal */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

/* Grid responsive adjustments */
@media (max-width: 768px) {
  .grid-cols-1.md\:grid-cols-2.lg\:grid-cols-3 {
    grid-template-columns: 1fr;
  }
}

@media (min-width: 768px) and (max-width: 1024px) {
  .grid-cols-1.md\:grid-cols-2.lg\:grid-cols-3 {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>

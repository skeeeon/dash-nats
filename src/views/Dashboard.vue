<template>
  <div class="h-full flex flex-col">
    <!-- Dashboard Header -->
    <div class="flex-shrink-0 p-6 border-b border-border bg-background/95 backdrop-blur">
      <div class="flex items-center justify-between">
        <div>
          <div class="flex items-center gap-3">
            <h1 class="text-xl font-semibold text-foreground">{{ dashboardTitle }}</h1>
            <span v-if="hasCards" class="text-sm text-muted-foreground">
              {{ cards.length }} {{ cards.length === 1 ? 'card' : 'cards' }}
            </span>
          </div>
          <div class="text-muted-foreground text-sm mt-1">
            {{ connectionStatusMessage }}
          </div>
        </div>
        
        <div class="flex items-center gap-3">
          <!-- Add Card Button -->
          <button
            v-if="isConnected"
            @click="showAddCard = true"
            :disabled="isDashboardLoading"
            class="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors font-medium disabled:opacity-50"
          >
            + Add Card
          </button>
          
          <!-- Dashboard Actions -->
          <div class="relative">
            <button
              @click="showDashboardMenu = !showDashboardMenu"
              class="p-2 hover:bg-accent rounded-md transition-colors"
              title="Dashboard options"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
            </button>
            
            <!-- Dashboard Menu -->
            <div
              v-if="showDashboardMenu"
              v-click-outside="() => showDashboardMenu = false"
              class="absolute right-0 top-full mt-2 w-48 bg-popover border border-border rounded-lg shadow-lg py-1 z-50"
            >
              <button
                @click="clearDashboard"
                class="w-full px-4 py-2 text-left text-sm hover:bg-accent transition-colors"
              >
                Clear Dashboard
              </button>
              <button
                @click="exportDashboard"
                class="w-full px-4 py-2 text-left text-sm hover:bg-accent transition-colors"
              >
                Export Dashboard
              </button>
              <button
                @click="importDashboard"
                class="w-full px-4 py-2 text-left text-sm hover:bg-accent transition-colors"
              >
                Import Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Main Dashboard Content -->
    <div class="flex-1 overflow-hidden">
      <!-- Loading State -->
      <div v-if="isDashboardLoading" class="h-full flex items-center justify-center">
        <div class="text-center">
          <svg class="w-8 h-8 animate-spin mx-auto mb-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <p class="text-muted-foreground">Initializing dashboard...</p>
        </div>
      </div>
      
      <!-- Connection Required State -->
      <div v-else-if="!isConnected" class="h-full flex items-center justify-center">
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
      <div v-else class="h-full">
        <DashboardGrid
          ref="dashboardGrid"
          :dashboard-id="dashboardId"
          :show-status-text="showStatusText"
          :allow-title-edit="allowTitleEdit"
          @card-selected="handleCardSelected"
          @card-deselected="handleCardDeselected"
          @card-added="handleCardAdded"
          @card-removed="handleCardRemoved"
          @layout-changed="handleLayoutChanged"
        />
      </div>
    </div>
    
    <!-- Add Card Modal -->
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
            <div class="flex items-center gap-3">
              <svg class="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
              </svg>
              <div>
                <div class="font-medium">Publisher Card</div>
                <div class="text-sm text-muted-foreground">Send messages to NATS topics</div>
              </div>
            </div>
          </button>
          
          <button
            @click="addCard('subscriber')"
            class="w-full p-4 text-left border border-border rounded-lg hover:bg-accent transition-colors"
          >
            <div class="flex items-center gap-3">
              <svg class="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2 2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"/>
              </svg>
              <div>
                <div class="font-medium">Subscriber Card</div>
                <div class="text-sm text-muted-foreground">Receive messages from NATS topics</div>
              </div>
            </div>
          </button>
          
          <button
            @click="addCard('chart')"
            class="w-full p-4 text-left border border-border rounded-lg hover:bg-accent transition-colors"
          >
            <div class="flex items-center gap-3">
              <svg class="w-8 h-8 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
              </svg>
              <div>
                <div class="font-medium">Chart Card</div>
                <div class="text-sm text-muted-foreground">Visualize data from NATS topics</div>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<template>
  <div class="max-w-2xl mx-auto p-6">
    <div class="space-y-6">
      <!-- Header -->
      <div class="text-center">
        <h2 class="text-2xl font-bold text-foreground">NATS Connection</h2>
        <p class="text-muted-foreground mt-2">
          Configure your connection to the NATS server
        </p>
      </div>

      <!-- Connection Form -->
      <form @submit.prevent="handleSubmit" class="space-y-6">
        <!-- Connection Name -->
        <div class="space-y-2">
          <label for="connectionName" class="text-sm font-medium text-foreground">
            Connection Name
          </label>
          <input
            id="connectionName"
            v-model="form.name"
            type="text"
            placeholder="My NATS Connection"
            :class="[
              'w-full px-3 py-2 border rounded-md transition-colors',
              'focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent',
              'bg-background text-foreground border-input',
              getFieldError('name') && 'border-red-500 focus:ring-red-500'
            ]"
          />
          <FieldError :error="getFieldError('name')" />
        </div>

        <!-- Server URLs -->
        <div class="space-y-2">
          <label class="text-sm font-medium text-foreground">
            Server URLs
          </label>
          <div class="space-y-2">
            <div
              v-for="(server, index) in form.servers"
              :key="index"
              class="flex gap-2"
            >
              <input
                v-model="form.servers[index]"
                type="url"
                placeholder="ws://localhost:8080"
                :class="[
                  'flex-1 px-3 py-2 border rounded-md transition-colors',
                  'focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent',
                  'bg-background text-foreground border-input',
                  getFieldError(`servers.${index}`) && 'border-red-500 focus:ring-red-500'
                ]"
              />
              <button
                v-if="form.servers.length > 1"
                type="button"
                @click="removeServer(index)"
                class="px-3 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                title="Remove server"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
          <button
            type="button"
            @click="addServer"
            class="text-sm text-primary hover:text-primary/80 font-medium"
          >
            + Add Server
          </button>
          <FieldError :error="getFieldError('servers')" />
        </div>

        <!-- Authentication Type -->
        <div class="space-y-2">
          <label class="text-sm font-medium text-foreground">
            Authentication
          </label>
          <div class="space-y-3">
            <label class="flex items-center gap-2">
              <input
                v-model="form.authType"
                type="radio"
                value="none"
                class="text-primary focus:ring-primary"
              />
              <span class="text-sm">No Authentication</span>
            </label>
            <label class="flex items-center gap-2">
              <input
                v-model="form.authType"
                type="radio"
                value="userpass"
                class="text-primary focus:ring-primary"
              />
              <span class="text-sm">Username & Password</span>
            </label>
            <label class="flex items-center gap-2">
              <input
                v-model="form.authType"
                type="radio"
                value="creds"
                class="text-primary focus:ring-primary"
              />
              <span class="text-sm">Credentials File</span>
            </label>
          </div>
        </div>

        <!-- Username/Password Fields -->
        <div v-if="form.authType === 'userpass'" class="space-y-4">
          <div class="space-y-2">
            <label for="username" class="text-sm font-medium text-foreground">
              Username
            </label>
            <input
              id="username"
              v-model="form.username"
              type="text"
              autocomplete="username"
              :class="[
                'w-full px-3 py-2 border rounded-md transition-colors',
                'focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent',
                'bg-background text-foreground border-input',
                getFieldError('username') && 'border-red-500 focus:ring-red-500'
              ]"
            />
            <FieldError :error="getFieldError('username')" />
          </div>
          <div class="space-y-2">
            <label for="password" class="text-sm font-medium text-foreground">
              Password
            </label>
            <input
              id="password"
              v-model="form.password"
              type="password"
              autocomplete="current-password"
              :class="[
                'w-full px-3 py-2 border rounded-md transition-colors',
                'focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent',
                'bg-background text-foreground border-input',
                getFieldError('password') && 'border-red-500 focus:ring-red-500'
              ]"
            />
            <FieldError :error="getFieldError('password')" />
          </div>
        </div>

        <!-- Credentials File -->
        <div v-if="form.authType === 'creds'" class="space-y-4">
          <div class="space-y-2">
            <label class="text-sm font-medium text-foreground">
              Credentials File
            </label>
            
            <!-- File Upload -->
            <div class="space-y-2">
              <div
                :class="[
                  'border-2 border-dashed rounded-lg p-6 text-center transition-colors',
                  isDragOver ? 'border-primary bg-primary/5' : 'border-border',
                  'hover:border-primary/50 hover:bg-primary/5'
                ]"
                @dragover.prevent="isDragOver = true"
                @dragleave.prevent="isDragOver = false"
                @drop.prevent="handleFileDrop"
              >
                <input
                  ref="fileInput"
                  type="file"
                  accept=".creds"
                  @change="handleFileSelect"
                  class="hidden"
                />
                
                <div class="space-y-2">
                  <svg class="w-8 h-8 mx-auto text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <div>
                    <button
                      type="button"
                      @click="$refs.fileInput.click()"
                      class="text-primary hover:text-primary/80 font-medium"
                    >
                      Choose credentials file
                    </button>
                    <span class="text-muted-foreground"> or drag and drop</span>
                  </div>
                  <p class="text-xs text-muted-foreground">.creds files only</p>
                </div>
              </div>
              
              <!-- OR Separator -->
              <div class="relative">
                <div class="absolute inset-0 flex items-center">
                  <div class="w-full border-t border-border"></div>
                </div>
                <div class="relative flex justify-center text-xs uppercase">
                  <span class="bg-background px-2 text-muted-foreground">Or</span>
                </div>
              </div>
              
              <!-- Text Area for pasting -->
              <div class="space-y-2">
                <label for="credsContent" class="text-sm text-muted-foreground">
                  Paste credentials content:
                </label>
                <textarea
                  id="credsContent"
                  v-model="form.credsContent"
                  rows="6"
                  placeholder="Paste your .creds file content here..."
                  :class="[
                    'w-full px-3 py-2 border rounded-md transition-colors font-mono text-sm',
                    'focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent',
                    'bg-background text-foreground border-input',
                    getFieldError('credsContent') && 'border-red-500 focus:ring-red-500'
                  ]"
                ></textarea>
              </div>
            </div>
            <FieldError :error="getFieldError('credsContent')" />
          </div>
        </div>

        <!-- Advanced Options -->
        <div class="space-y-4">
          <button
            type="button"
            @click="showAdvanced = !showAdvanced"
            class="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg 
              :class="['w-4 h-4 transition-transform', showAdvanced && 'rotate-90']"
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
            Advanced Options
          </button>
          
          <div v-if="showAdvanced" class="space-y-4 pl-6 border-l-2 border-border">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="space-y-2">
                <label for="maxReconnectAttempts" class="text-sm font-medium text-foreground">
                  Max Reconnect Attempts
                </label>
                <input
                  id="maxReconnectAttempts"
                  v-model.number="form.options.maxReconnectAttempts"
                  type="number"
                  min="0"
                  max="100"
                  class="w-full px-3 py-2 border rounded-md bg-background text-foreground border-input focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              
              <div class="space-y-2">
                <label for="reconnectTimeWait" class="text-sm font-medium text-foreground">
                  Reconnect Wait (ms)
                </label>
                <input
                  id="reconnectTimeWait"
                  v-model.number="form.options.reconnectTimeWait"
                  type="number"
                  min="100"
                  max="30000"
                  step="100"
                  class="w-full px-3 py-2 border rounded-md bg-background text-foreground border-input focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
            </div>
            
            <div class="space-y-2">
              <label class="flex items-center gap-2">
                <input
                  v-model="form.options.reconnect"
                  type="checkbox"
                  class="text-primary focus:ring-primary"
                />
                <span class="text-sm">Enable automatic reconnection</span>
              </label>
              
              <label class="flex items-center gap-2">
                <input
                  v-model="form.options.autoReconnectOnStartup"
                  type="checkbox"
                  class="text-primary focus:ring-primary"
                />
                <span class="text-sm">Auto-reconnect on application startup</span>
              </label>
            </div>
          </div>
        </div>

        <!-- Form Actions -->
        <div class="flex gap-3 pt-6 border-t border-border">
          <button
            type="button"
            @click="handleTest"
            :disabled="isLoading || !canTest"
            class="px-4 py-2 text-sm font-medium border border-input rounded-md hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <span v-if="!isTesting">Test Connection</span>
            <span v-else class="flex items-center gap-2">
              <svg class="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Testing...
            </span>
          </button>
          
          <button
            type="submit"
            :disabled="isLoading || !isValid"
            class="flex-1 px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <span v-if="!isConnecting">Connect</span>
            <span v-else class="flex items-center justify-center gap-2">
              <svg class="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Connecting...
            </span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useNatsConnection } from '@/composables/useNatsConnection.js';

// Props
const props = defineProps({
  /**
   * Initial configuration to populate form
   */
  initialConfig: {
    type: Object,
    default: null
  }
});

// Emits
const emit = defineEmits(['connected', 'test-result']);

// Composables
const {
  connect,
  testConnection,
  createDefaultConfig,
  validateConfig,
  isConnecting
} = useNatsConnection();

// Local state
const form = ref(createDefaultConfig());
const errors = ref({});
const isDragOver = ref(false);
const showAdvanced = ref(false);
const isTesting = ref(false);

// Computed properties
const isLoading = computed(() => isConnecting.value || isTesting.value);

const isValid = computed(() => {
  const validation = validateConfig(form.value);
  return validation.isValid;
});

const canTest = computed(() => {
  return form.value.servers?.length > 0 && form.value.authType;
});

// Methods
function getFieldError(field) {
  return errors.value[field];
}

function clearErrors() {
  errors.value = {};
}

function setFieldError(field, message) {
  errors.value[field] = message;
}

function validateForm() {
  clearErrors();
  
  const validation = validateConfig(form.value);
  
  if (!validation.isValid) {
    // Map validation errors to form fields
    validation.errors.forEach(error => {
      if (error.includes('server')) {
        setFieldError('servers', error);
      } else if (error.includes('username')) {
        setFieldError('username', error);
      } else if (error.includes('password')) {
        setFieldError('password', error);
      } else if (error.includes('credentials')) {
        setFieldError('credsContent', error);
      } else if (error.includes('name')) {
        setFieldError('name', error);
      }
    });
  }
  
  return validation.isValid;
}

async function handleSubmit() {
  if (!validateForm()) {
    return;
  }

  try {
    await connect(form.value);
    emit('connected', form.value);
  } catch (error) {
    setFieldError('general', error.message);
  }
}

async function handleTest() {
  if (!validateForm()) {
    return;
  }

  try {
    isTesting.value = true;
    const result = await testConnection(form.value);
    
    emit('test-result', { success: result, config: form.value });
    
    if (result) {
      // Show success feedback
      console.log('Connection test successful');
    } else {
      setFieldError('general', 'Connection test failed');
    }
  } catch (error) {
    setFieldError('general', `Test failed: ${error.message}`);
    emit('test-result', { success: false, error: error.message, config: form.value });
  } finally {
    isTesting.value = false;
  }
}

function addServer() {
  form.value.servers.push('');
}

function removeServer(index) {
  if (form.value.servers.length > 1) {
    form.value.servers.splice(index, 1);
  }
}

function handleFileSelect(event) {
  const file = event.target.files[0];
  if (file) {
    readCredentialsFile(file);
  }
}

function handleFileDrop(event) {
  isDragOver.value = false;
  const file = event.dataTransfer.files[0];
  if (file) {
    readCredentialsFile(file);
  }
}

function readCredentialsFile(file) {
  if (!file.name.endsWith('.creds')) {
    setFieldError('credsContent', 'Please select a .creds file');
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    form.value.credsContent = e.target.result;
    clearErrors();
  };
  reader.onerror = () => {
    setFieldError('credsContent', 'Failed to read credentials file');
  };
  reader.readAsText(file);
}

// Watchers
watch(() => form.value.authType, () => {
  // Clear authentication-related errors when auth type changes
  clearErrors();
});

// Lifecycle
onMounted(() => {
  if (props.initialConfig) {
    form.value = { ...createDefaultConfig(), ...props.initialConfig };
  }
});

// Field Error Component
const FieldError = {
  props: ['error'],
  template: `
    <div v-if="error" class="text-sm text-red-600 dark:text-red-400">
      {{ error }}
    </div>
  `
};
</script>

<style scoped>
/* Spinning animation */
@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.animate-spin {
  animation: spin 1s linear infinite;
}

/* Smooth transitions for advanced options */
.space-y-4 > * + * {
  margin-top: 1rem;
}
</style>

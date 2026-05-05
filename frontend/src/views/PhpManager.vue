<script setup>
import { ref, onMounted } from 'vue'

const versions = ref([])
const loading = ref(false)
const message = ref('')
const messageType = ref('success')

const fetchVersions = async () => {
  const res = await fetch('/api/php/versions', {
    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
  })
  versions.value = await res.json()
}

const restartFpm = async (version) => {
  loading.value = true
  message.value = ''
  
  try {
    const res = await fetch('/api/php/restart', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ version })
    })
    const data = await res.json()
    
    await fetchVersions()
    
    if (res.ok) {
      messageType.value = 'success'
      message.value = `PHP ${version} FPM restarted successfully.`
    } else {
      messageType.value = 'error'
      message.value = `Failed to restart PHP ${version}: ${data.error || 'Unknown error'}`
    }
  } catch (err) {
    messageType.value = 'error'
    message.value = `An error occurred while restarting PHP ${version}.`
  } finally {
    loading.value = false
    
    // Auto-dismiss success message after 5 seconds
    if (messageType.value === 'success') {
      setTimeout(() => {
        message.value = ''
      }, 5000)
    }
  }
}

onMounted(fetchVersions)
</script>

<template>
  <div>
    <header class="mb-8">
      <h2 class="text-2xl font-bold tracking-tight text-white">PHP-FPM Manager</h2>
      <p class="text-gray-400 text-sm mt-1">Manage installed PHP versions and FastCGI Process Managers.</p>
    </header>

    <!-- Feedback Message -->
    <div v-if="message" 
         :class="messageType === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-400'" 
         class="mb-6 px-4 py-3 rounded-lg border flex items-center justify-between transition-all duration-300">
      <div class="flex items-center gap-2">
        <svg v-if="messageType === 'success'" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
        <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
        <span class="text-sm font-medium">{{ message }}</span>
      </div>
      <button @click="message = ''" class="hover:opacity-70 transition-opacity focus:outline-none">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
      </button>
    </div>

    <div class="grid grid-cols-1 gap-8">
      <div class="bg-gray-950 border border-gray-800 rounded-xl shadow-sm overflow-hidden">
        <div class="px-6 py-4 border-b border-gray-800 bg-gray-900/50">
          <h3 class="text-sm font-semibold text-white">Installed PHP Versions</h3>
        </div>
        <div class="p-0">
          <div v-if="versions.length === 0" class="text-gray-500 text-sm py-6 text-center">No PHP versions detected.</div>
          
          <div v-for="php in versions" :key="php.version" class="flex items-center justify-between px-6 py-4 border-b border-gray-800 last:border-0 hover:bg-gray-900/50 transition-colors">
            <div class="flex items-center space-x-4">
              <div class="w-2 h-2 rounded-full" :class="php.status === 'online' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-red-500'"></div>
              <div>
                <h4 class="text-white font-medium text-sm">PHP {{ php.version }}</h4>
                <p class="text-xs text-gray-400 mt-0.5">php{{ php.version }}-fpm</p>
              </div>
            </div>
            <div class="flex space-x-4">
              <button @click="restartFpm(php.version)" :disabled="loading" class="text-white hover:text-white bg-gray-800 border border-gray-700 hover:bg-gray-700 shadow-sm transition-colors font-medium text-xs px-3 py-1.5 rounded-md flex items-center gap-2 disabled:opacity-50">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" :class="{'animate-spin': loading}"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                {{ loading ? 'Restarting...' : 'Restart FPM' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'

const stats = ref({ cpuLoad: '0', memory: { percent: 0, used: '0', total: '0' } })
const cpuHistory = ref(Array(20).fill(0))
const apps = ref([])
const services = ref([])
const loading = ref(true)
const error = ref('')

let pollInterval

const fetchDashboardData = async () => {
  try {
    const token = localStorage.getItem('token')
    const headers = { 'Authorization': `Bearer ${token}` }
    
    const [statsRes, appsRes, servicesRes] = await Promise.all([
      fetch('/api/system/stats', { headers }),
      fetch('/api/system/apps', { headers }),
      fetch('/api/system/services', { headers })
    ])
    
    if (statsRes.status === 401 || appsRes.status === 401) {
      window.location.href = '/login'
      return
    }

    stats.value = await statsRes.json()
    cpuHistory.value.shift()
    cpuHistory.value.push(parseFloat(stats.value.cpuLoad) || 0)
    apps.value = await appsRes.json()
    services.value = await servicesRes.json()
    error.value = ''
  } catch (err) {
    error.value = 'Failed to fetch server data'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchDashboardData()
  pollInterval = setInterval(fetchDashboardData, 3000)
})

onUnmounted(() => {
  clearInterval(pollInterval)
})

const cpuGraphLine = computed(() => {
  const width = 200;
  const height = 40;
  const max = 100;
  const step = width / (cpuHistory.value.length - 1);
  
  return cpuHistory.value.map((value, index) => {
    const x = index * step;
    const y = height - ((value / max) * height);
    return `${x},${y}`;
  }).join(' ');
});

const cpuGraphPoints = computed(() => {
  return `${cpuGraphLine.value} 200,40 0,40`;
});

const performAppAction = async (appName, action) => {
  const token = localStorage.getItem('token')
  try {
    await fetch('/api/system/apps/action', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` 
      },
      body: JSON.stringify({ appName, action })
    })
    fetchDashboardData()
  } catch (err) {
    error.value = 'Action failed'
  }
}

const showEnvModal = ref(false)
const currentEnvApp = ref('')
const currentEnvContent = ref('')
const savingEnv = ref(false)
const restartOnSave = ref(true)

const openEnvModal = async (appName) => {
  currentEnvApp.value = appName
  currentEnvContent.value = 'Loading...'
  showEnvModal.value = true
  const token = localStorage.getItem('token')
  try {
    const res = await fetch(`/api/apps/${appName}/env`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    const data = await res.json()
    currentEnvContent.value = data.content || ''
  } catch (e) {
    currentEnvContent.value = 'Error loading env'
  }
}

const saveEnv = async () => {
  savingEnv.value = true
  const token = localStorage.getItem('token')
  try {
    await fetch(`/api/apps/${currentEnvApp.value}/env`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` 
      },
      body: JSON.stringify({ content: currentEnvContent.value })
    })
    
    if (restartOnSave.value) {
      await performAppAction(currentEnvApp.value, 'restart')
    }
    
    showEnvModal.value = false
  } catch(e) {
    alert('Failed to save env')
  } finally {
    savingEnv.value = false
  }
}

const showLogsModal = ref(false)
const currentLogsApp = ref('')
const currentLogsContent = ref({ out: '', err: '' })

const openLogsModal = async (appName) => {
  currentLogsApp.value = appName
  currentLogsContent.value = { out: 'Loading...', err: 'Loading...' }
  showLogsModal.value = true
  const token = localStorage.getItem('token')
  try {
    const res = await fetch(`/api/apps/${appName}/logs`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    currentLogsContent.value = await res.json()
  } catch (e) {
    currentLogsContent.value = { out: 'Error loading logs', err: 'Error loading logs' }
  }
}

const refreshLogs = async () => {
  const token = localStorage.getItem('token')
  try {
    const res = await fetch(`/api/apps/${currentLogsApp.value}/logs`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    currentLogsContent.value = await res.json()
  } catch (e) {
    currentLogsContent.value = { out: 'Error loading logs', err: 'Error loading logs' }
  }
}
</script>

<template>
  <div>
    <header class="flex justify-between items-center mb-8">
      <div>
        <h2 class="text-2xl font-bold tracking-tight text-white">Dashboard</h2>
        <p class="text-gray-400 text-sm mt-1">Overview of your server health and active apps.</p>
      </div>
      <router-link to="/deployments" class="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors shadow-sm">
        Deploy New App
      </router-link>
    </header>

    <div v-if="error" class="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-md text-sm text-red-500">
      {{ error }}
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <div class="bg-gray-950 border border-gray-800 rounded-xl p-6 shadow-sm relative overflow-hidden flex flex-col justify-between">
        <div class="relative z-10">
          <h3 class="text-gray-400 text-sm font-medium">CPU Usage</h3>
          <p class="text-3xl font-bold text-white mt-1">{{ stats.cpuLoad }}%</p>
        </div>
        <div class="absolute bottom-0 left-0 right-0 h-16 opacity-40">
          <svg viewBox="0 0 200 40" class="w-full h-full overflow-visible preserve-3d" preserveAspectRatio="none">
            <defs>
              <linearGradient id="cpuGradient" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stop-color="#ffffff" stop-opacity="0.3" />
                <stop offset="100%" stop-color="#ffffff" stop-opacity="0" />
              </linearGradient>
            </defs>
            <polygon :points="cpuGraphPoints" fill="url(#cpuGradient)" />
            <polyline :points="cpuGraphLine" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </div>
      </div>
      <div class="bg-gray-950 border border-gray-800 rounded-xl p-6 shadow-sm">
        <h3 class="text-gray-400 text-sm font-medium">Memory Usage</h3>
        <p class="text-3xl font-bold text-white mt-1">{{ stats.memory.used }} GB <span class="text-sm text-gray-500 font-normal">/ {{ stats.memory.total }} GB</span></p>
        <div class="w-full bg-gray-800 h-1.5 mt-4 rounded-full overflow-hidden">
          <div class="bg-white h-full rounded-full transition-all duration-500" :style="{ width: stats.memory.percent + '%' }"></div>
        </div>
      </div>
      <div class="bg-gray-950 border border-gray-800 rounded-xl p-6 shadow-sm">
        <h3 class="text-gray-400 text-sm font-medium">Active Services (PM2)</h3>
        <p class="text-3xl font-bold text-white mt-1">{{ apps.filter(a => a.status === 'online').length }} <span class="text-sm text-gray-500 font-normal">/ {{ apps.length }}</span></p>
      </div>
    </div>

    <!-- Services Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <!-- App List -->
      <div class="bg-gray-950 border border-gray-800 rounded-xl shadow-sm overflow-hidden">
        <div class="px-6 py-4 border-b border-gray-800 bg-gray-900/50">
          <h3 class="text-sm font-semibold text-white">Node.js Apps (PM2)</h3>
        </div>
        <div class="p-0">
          <div v-if="loading" class="text-gray-500 text-sm text-center py-6">Loading apps...</div>
          <div v-else-if="apps.length === 0" class="text-gray-500 text-sm text-center py-6">No apps managed by PM2.</div>
          
          <div v-else v-for="app in apps" :key="app.id" class="flex items-center justify-between px-6 py-4 border-b border-gray-800 last:border-0 hover:bg-gray-900/50 transition-colors">
            <div class="flex items-center space-x-4">
              <div class="w-2 h-2 rounded-full" :class="app.status === 'online' ? 'bg-green-500' : 'bg-red-500'"></div>
              <div>
                <h4 class="text-white font-medium text-sm">{{ app.name }}</h4>
                <div class="flex gap-3 text-gray-400 text-xs mt-1">
                  <span>RAM: {{ app.memory }}MB</span>
                  <span>CPU: {{ app.cpu }}%</span>
                  <span>Uptime: {{ Math.round((Date.now() - app.uptime)/1000/60) }} min</span>
                </div>
              </div>
            </div>
            <div class="flex items-center space-x-2">
              <button @click="openEnvModal(app.name)" class="text-indigo-400 hover:text-indigo-300 px-2 py-1.5 transition-colors rounded-md hover:bg-indigo-500/10 text-xs font-bold" title=".env Editor">
                ENV
              </button>
              <button @click="openLogsModal(app.name)" class="text-blue-400 hover:text-blue-300 px-2 py-1.5 transition-colors rounded-md hover:bg-blue-500/10 text-xs font-bold" title="View Logs">
                LOGS
              </button>
              <div class="w-px h-4 bg-gray-800 mx-1"></div>
              <button @click="performAppAction(app.name, 'restart')" class="text-gray-500 hover:text-white p-1.5 transition-colors rounded-md hover:bg-gray-800" title="Restart">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
              </button>
              
              <button v-if="app.status === 'online'" @click="performAppAction(app.name, 'stop')" class="text-red-400 hover:text-red-300 p-1.5 transition-colors rounded-md hover:bg-red-500/10" title="Stop">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"></path></svg>
              </button>
              <button v-else @click="performAppAction(app.name, 'start')" class="text-green-400 hover:text-green-300 p-1.5 transition-colors rounded-md hover:bg-green-500/10" title="Start">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- System Services -->
      <div class="bg-gray-950 border border-gray-800 rounded-xl shadow-sm overflow-hidden h-fit">
        <div class="px-6 py-4 border-b border-gray-800 bg-gray-900/50">
          <h3 class="text-sm font-semibold text-white">System Services</h3>
        </div>
        <div class="p-0">
          <div v-if="loading" class="text-gray-500 text-sm text-center py-6">Loading services...</div>
          <div v-else-if="services.length === 0" class="text-gray-500 text-sm text-center py-6">No services found.</div>
          
          <div v-else v-for="service in services" :key="service.name" class="flex items-center justify-between px-6 py-4 border-b border-gray-800 last:border-0 hover:bg-gray-900/50 transition-colors">
            <div class="flex items-center space-x-4">
              <div class="w-2 h-2 rounded-full" :class="service.status === 'online' ? 'bg-green-500' : 'bg-red-500'"></div>
              <div>
                <h4 class="text-white font-medium text-sm capitalize">{{ service.name.replace('-fpm', ' FPM') }}</h4>
                <div class="flex gap-3 text-gray-400 text-xs mt-1">
                  <span>Status: {{ service.status }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Env Modal -->
    <div v-if="showEnvModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div class="bg-gray-950 border border-gray-800 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div class="px-6 py-4 border-b border-gray-800 flex justify-between items-center bg-gray-900/50">
          <h3 class="text-white font-semibold">Editing .env: {{ currentEnvApp }}</h3>
          <button @click="showEnvModal = false" class="text-gray-400 hover:text-white">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>
        <div class="p-6 flex-1 overflow-hidden flex flex-col">
          <textarea v-model="currentEnvContent" class="w-full flex-1 bg-black border border-gray-800 rounded-md p-4 text-sm text-green-400 font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500 min-h-[300px] resize-none" spellcheck="false"></textarea>
        </div>
        <div class="px-6 py-4 border-t border-gray-800 flex justify-between items-center bg-gray-900/50">
          <label class="flex items-center space-x-2 cursor-pointer">
            <input type="checkbox" v-model="restartOnSave" class="form-checkbox h-4 w-4 text-indigo-500 rounded border-gray-700 bg-gray-900 focus:ring-indigo-500 focus:ring-offset-gray-900 transition duration-150 ease-in-out">
            <span class="text-sm text-gray-300">Restart app on save</span>
          </label>
          <div class="flex gap-3">
            <button @click="showEnvModal = false" class="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">Cancel</button>
            <button @click="saveEnv" :disabled="savingEnv" class="px-4 py-2 text-sm bg-gray-800 text-white font-medium rounded-md hover:bg-gray-700 transition-colors disabled:opacity-50">
              {{ savingEnv ? 'Saving...' : 'Save Changes' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Logs Modal -->
    <div v-if="showLogsModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div class="bg-gray-950 border border-gray-800 rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
        <div class="px-6 py-4 border-b border-gray-800 flex justify-between items-center bg-gray-900/50">
          <h3 class="text-white font-semibold flex items-center space-x-3">
            <span>App Logs: {{ currentLogsApp }}</span>
            <button @click="refreshLogs" class="bg-gray-800 hover:bg-gray-700 text-xs font-medium px-3 py-1 rounded-md transition-colors text-gray-300 flex items-center gap-1">
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
              Refresh
            </button>
          </h3>
          <button @click="showLogsModal = false" class="text-gray-400 hover:text-white">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>
        <div class="p-0 flex-1 overflow-hidden flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-gray-800">
          <div class="flex-1 flex flex-col min-h-[250px]">
            <div class="px-4 py-2 bg-gray-900/80 text-xs font-semibold text-gray-400 tracking-wider">STDOUT (out.log)</div>
            <pre class="flex-1 p-4 bg-black text-green-400 text-xs font-mono overflow-auto whitespace-pre-wrap break-all">{{ currentLogsContent.out || 'No standard output.' }}</pre>
          </div>
          <div class="flex-1 flex flex-col min-h-[250px]">
            <div class="px-4 py-2 bg-gray-900/80 text-xs font-semibold text-gray-400 tracking-wider">STDERR (err.log)</div>
            <pre class="flex-1 p-4 bg-black text-red-400 text-xs font-mono overflow-auto whitespace-pre-wrap break-all">{{ currentLogsContent.err || 'No standard errors.' }}</pre>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

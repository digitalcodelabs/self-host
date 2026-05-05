<script setup>
import { ref } from 'vue'
import { io } from 'socket.io-client'
import SudoPrompt from '../components/SudoPrompt.vue'

const repoUrl = ref('')
const branch = ref('')
const appName = ref('')
const domain = ref('')
const port = ref('3000')
const deployDir = ref('/var/www')
const logs = ref([])
const isDeploying = ref(false)
const showSudoPrompt = ref(false)
const sudoError = ref('')
const currentSudoPassword = ref(null)

const handleSudoSubmit = (pwd) => {
  startDeployment(pwd)
}

const startDeployment = async (sudoPwd = null) => {
  if (typeof sudoPwd === 'string') currentSudoPassword.value = sudoPwd

  logs.value = []
  isDeploying.value = true
  sudoError.value = ''
  
  const token = localStorage.getItem('token')

  try {
    const res = await fetch('/api/deploy', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ 
        repoUrl: repoUrl.value, 
        branch: branch.value,
        appName: appName.value,
        domain: domain.value,
        port: port.value,
        deployDir: deployDir.value,
        sudoPassword: currentSudoPassword.value
      })
    })
    
    const data = await res.json()
    
    if (res.status === 403 && data.error === 'SUDO_REQUIRED') {
      showSudoPrompt.value = true
      isDeploying.value = false
      return
    }
    
    if (res.status === 403 && data.error === 'SUDO_INVALID') {
      sudoError.value = 'Incorrect sudo password.'
      showSudoPrompt.value = true
      isDeploying.value = false
      currentSudoPassword.value = null
      return
    }

    showSudoPrompt.value = false
    
    if (!res.ok) {
      logs.value.push(`Error: ${data.error || 'Could not start deployment.'}`)
      isDeploying.value = false
      return
    }

    const socket = io('/', { auth: { token } })
    socket.on('deploy-log', (msg) => logs.value.push(msg))
    socket.on('deploy-end', () => {
      isDeploying.value = false
      socket.disconnect()
    })

  } catch (error) {
    logs.value.push(`Error: ${error.message}`)
    isDeploying.value = false
  }
}
</script>

<template>
  <div>
    <SudoPrompt 
      :isOpen="showSudoPrompt" 
      :error="sudoError" 
      @submit="handleSudoSubmit" 
      @cancel="showSudoPrompt = false; isDeploying = false" 
    />
    <header class="mb-8">
      <h2 class="text-2xl font-bold tracking-tight text-white">Deploy Node.js App</h2>
      <p class="text-gray-400 text-sm mt-1">Automated CI/CD pipeline for deploying Node.js applications directly from Git.</p>
    </header>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div class="bg-gray-950 border border-gray-800 rounded-xl shadow-sm overflow-hidden h-fit">
        <div class="px-6 py-4 border-b border-gray-800 bg-gray-900/50">
          <h3 class="text-sm font-semibold text-white">New Deployment</h3>
        </div>
        <form @submit.prevent="startDeployment" class="p-6 space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-1">App Name</label>
            <input v-model="appName" type="text" placeholder="my-node-app" class="w-full bg-gray-950 border border-gray-800 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent transition-shadow" required pattern="[a-zA-Z0-9-]+" title="Only alphanumeric characters and hyphens allowed" />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-300 mb-1">Attach Domain (Optional)</label>
            <input v-model="domain" type="text" placeholder="api.myapp.com" class="w-full bg-gray-950 border border-gray-800 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent transition-shadow" />
            <p class="text-xs text-gray-500 mt-1">If provided, an Nginx reverse proxy will be automatically created.</p>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-1">Port</label>
              <input v-model="port" type="number" placeholder="3000" class="w-full bg-gray-950 border border-gray-800 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent transition-shadow" required />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-1">Branch</label>
              <input v-model="branch" type="text" placeholder="default" class="w-full bg-gray-950 border border-gray-800 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent transition-shadow" />
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-300 mb-1">Base Deploy Directory</label>
            <input v-model="deployDir" type="text" placeholder="/var/www" class="w-full bg-gray-950 border border-gray-800 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent transition-shadow" required pattern="^\/.*" title="Must be an absolute Linux path" />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-300 mb-1">Git Repository URL</label>
            <input v-model="repoUrl" type="text" placeholder="https://github.com/user/repo.git" class="w-full bg-gray-950 border border-gray-800 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent transition-shadow" required />
          </div>

          <button :disabled="isDeploying" class="w-full bg-gray-800 hover:bg-gray-700 text-white text-sm font-medium py-2 rounded-md transition-colors disabled:opacity-50 mt-4 flex items-center justify-center gap-2">
            <span v-if="isDeploying" class="w-4 h-4 border-2 border-gray-900 border-t-transparent rounded-full animate-spin"></span>
            {{ isDeploying ? 'Deploying...' : 'Start Deployment' }}
          </button>
        </form>
      </div>

      <div class="lg:col-span-2 bg-black border border-gray-800 rounded-xl overflow-hidden shadow-sm flex flex-col h-[500px]">
        <div class="px-4 py-2 bg-gray-900/50 flex items-center space-x-2 border-b border-gray-800">
          <div class="w-3 h-3 rounded-full bg-red-500"></div>
          <div class="w-3 h-3 rounded-full bg-yellow-500"></div>
          <div class="w-3 h-3 rounded-full bg-green-500"></div>
          <span class="text-gray-500 text-xs ml-2">deployment log</span>
        </div>
        <div class="p-4 flex-1 overflow-y-auto text-sm text-green-400 bg-black">
          <div v-if="logs.length === 0" class="text-gray-600">Waiting for deployment to start...</div>
          <div v-for="(log, idx) in logs" :key="idx" class="whitespace-pre-wrap">{{ log }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

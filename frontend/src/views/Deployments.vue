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
const appType = ref('node')
const isExisting = ref(false)
const useLegacyPeerDeps = ref(false)
const logs = ref([])
const isDeploying = ref(false)
const showSudoPrompt = ref(false)
const sudoError = ref('')
const currentSudoPassword = ref('')

const handleSudoSubmit = (pwd) => {
  startDeployment(pwd)
}

const sshPublicKey = ref('')
const isLoadingSsh = ref(false)

const fetchSshKey = async () => {
  const token = localStorage.getItem('token')
  const res = await fetch('/api/system/ssh-key', {
    headers: { 'Authorization': `Bearer ${token}` }
  })
  const data = await res.json()
  sshPublicKey.value = data.publicKey || ''
}

const generateSshKey = async () => {
  isLoadingSsh.value = true
  const token = localStorage.getItem('token')
  try {
    const res = await fetch('/api/system/ssh-key', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    })
    const data = await res.json()
    sshPublicKey.value = data.publicKey
  } finally {
    isLoadingSsh.value = false
  }
}

import { onMounted } from 'vue'
onMounted(fetchSshKey)

const copyToClipboard = async (text) => {
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  } catch (err) {
    // Fallback for non-secure contexts
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-9999px";
    textArea.style.top = "0";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
      alert('Copied to clipboard!');
    } catch (copyErr) {
      console.error('Fallback copy failed', copyErr);
      alert('Failed to copy. Please copy manually.');
    }
    document.body.removeChild(textArea);
  }
}

const startDeployment = async (sudoPwd = null) => {
  if (typeof sudoPwd === 'string') currentSudoPassword.value = sudoPwd

  logs.value = []
  isDeploying.value = true
  sudoError.value = ''
  
  const token = localStorage.getItem('token')

  const socket = io('/', { auth: { token } })
  
  await new Promise((resolve) => {
    socket.on('connect', resolve)
    setTimeout(resolve, 1000) // Fallback timeout
  })

  socket.on('deploy-log', (msg) => {
    // Only push if we haven't seen it, though logs is empty initially
    logs.value.push(msg)
  })
  socket.on('deploy-end', () => {
    isDeploying.value = false
    socket.disconnect()
  })

  try {
    const res = await fetch('/api/deploy', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ 
        repoUrl: isExisting.value ? 'existing' : repoUrl.value, 
        branch: branch.value,
        appName: appName.value,
        domain: domain.value,
        port: port.value,
        deployDir: deployDir.value,
        appType: appType.value,
        useLegacyPeerDeps: useLegacyPeerDeps.value,
        sudoPassword: currentSudoPassword.value
      })
    })
    
    const data = await res.json()
    
    if (res.status === 403 && data.error === 'SUDO_REQUIRED') {
      showSudoPrompt.value = true
      isDeploying.value = false
      socket.disconnect()
      return
    }
    
    if (res.status === 403 && data.error === 'SUDO_INVALID') {
      sudoError.value = 'Incorrect sudo password.'
      showSudoPrompt.value = true
      isDeploying.value = false
      currentSudoPassword.value = null
      socket.disconnect()
      return
    }

    showSudoPrompt.value = false
    
    if (!res.ok) {
      logs.value.push(`Error: ${data.error || 'Could not start deployment.'}`)
      isDeploying.value = false
      socket.disconnect()
      return
    }

  } catch (error) {
    logs.value.push(`Error: ${error.message}`)
    isDeploying.value = false
    socket.disconnect()
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
      <div class="space-y-6">
        <div class="bg-gray-950 border border-gray-800 rounded-xl shadow-sm overflow-hidden h-fit">
        <div class="px-6 py-4 border-b border-gray-800 bg-gray-900/50">
          <h3 class="text-sm font-semibold text-white">New Deployment</h3>
        </div>
        <form @submit.prevent="startDeployment" class="p-6 space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-1">App Name</label>
            <input v-model="appName" type="text" placeholder="my-node-app" class="w-full bg-gray-950 border border-gray-800 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent transition-shadow" required pattern="[a-zA-Z0-9-_\.]+" title="Only alphanumeric characters, hyphens, underscores, and dots allowed" />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-300 mb-1">Attach Domain (Optional)</label>
            <input v-model="domain" type="text" placeholder="api.myapp.com" class="w-full bg-gray-950 border border-gray-800 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent transition-shadow" />
            <p class="text-xs text-gray-500 mt-1">If provided, an Nginx reverse proxy will be automatically created.</p>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-300 mb-1">App Type</label>
            <select v-model="appType" class="w-full bg-gray-950 border border-gray-800 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent transition-shadow">
              <option value="node">Standard Node.js</option>
              <option value="nuxt">Nuxt.js (with public folder)</option>
            </select>
          </div>

          <div class="flex items-center space-x-2 py-2">
            <input v-model="isExisting" type="checkbox" id="isExisting" class="w-4 h-4 rounded border-gray-800 bg-gray-950 text-white focus:ring-0" />
            <label for="isExisting" class="text-sm font-medium text-gray-300 cursor-pointer">Existing Project (Skip Git)</label>
          </div>

          <div class="flex items-center space-x-2 pb-2">
            <input v-model="useLegacyPeerDeps" type="checkbox" id="useLegacyPeerDeps" class="w-4 h-4 rounded border-gray-800 bg-gray-950 text-white focus:ring-0" />
            <label for="useLegacyPeerDeps" class="text-sm font-medium text-gray-300 cursor-pointer text-yellow-500/80">Use Legacy Peer Deps (Fixes ERESOLVE)</label>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-1">Port</label>
              <input v-model="port" type="number" placeholder="3000" class="w-full bg-gray-950 border border-gray-800 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent transition-shadow" required />
            </div>
            <div v-if="!isExisting">
              <label class="block text-sm font-medium text-gray-300 mb-1">Branch</label>
              <input v-model="branch" type="text" placeholder="default" class="w-full bg-gray-950 border border-gray-800 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent transition-shadow" />
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-300 mb-1">Base Deploy Directory</label>
            <input v-model="deployDir" type="text" placeholder="/var/www" class="w-full bg-gray-950 border border-gray-800 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent transition-shadow" required pattern="^\/.*" title="Must be an absolute Linux path" />
          </div>

          <div v-if="!isExisting">
            <label class="block text-sm font-medium text-gray-300 mb-1">Git Repository URL (Optional if .git exists)</label>
            <input v-model="repoUrl" type="text" placeholder="https or git@github.com:user/repo.git" class="w-full bg-gray-950 border border-gray-800 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent transition-shadow" />
          </div>

          <button :disabled="isDeploying" class="w-full bg-gray-800 hover:bg-gray-700 text-white text-sm font-medium py-2 rounded-md transition-colors disabled:opacity-50 mt-4 flex items-center justify-center gap-2">
            <span v-if="isDeploying" class="w-4 h-4 border-2 border-gray-900 border-t-transparent rounded-full animate-spin"></span>
            {{ isDeploying ? 'Deploying...' : 'Start Deployment' }}
          </button>
        </form>
      </div>

      <div class="bg-gray-950 border border-gray-800 rounded-xl shadow-sm overflow-hidden h-fit">
        <div class="px-6 py-4 border-b border-gray-800 bg-gray-900/50 flex justify-between items-center">
          <h3 class="text-sm font-semibold text-white">Server SSH Key</h3>
          <button v-if="!sshPublicKey" @click="generateSshKey" :disabled="isLoadingSsh" class="text-xs bg-white text-black px-2 py-1 rounded font-bold hover:bg-gray-200 transition-colors">
            {{ isLoadingSsh ? 'Generating...' : 'Generate Key' }}
          </button>
        </div>
        <div class="p-6">
          <p class="text-xs text-gray-500 mb-3">Add this public key to your GitHub repository's <b>Deploy Keys</b> for private repo access.</p>
          <div v-if="sshPublicKey" class="relative group">
            <pre @click="copyToClipboard(sshPublicKey)" class="bg-black border border-gray-800 rounded p-3 text-[10px] text-gray-400 font-mono break-all whitespace-pre-wrap cursor-pointer group-hover:border-gray-600 transition-colors">{{ sshPublicKey }}</pre>
            <div class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              <span class="bg-gray-800 text-white text-[10px] px-2 py-1 rounded">Click to Copy</span>
            </div>
          </div>
          <div v-else class="text-sm text-gray-600 italic">No SSH key found. Click generate to create one.</div>
        </div>
      </div>
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

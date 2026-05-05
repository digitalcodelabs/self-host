<script setup>
import { ref, watch, onMounted } from 'vue'
import SudoPrompt from '../components/SudoPrompt.vue'

const sites = ref([])
const phpVersionsList = ref([])

const domain = ref('')
const type = ref('php') // proxy | php
const port = ref('')
const documentRoot = ref('/var/www/myapp.com/public')
const phpVersion = ref('')
const loading = ref(false)

let hasManuallyEditedRoot = false

watch(domain, (newVal) => {
  if (!hasManuallyEditedRoot) {
    documentRoot.value = newVal ? `/var/www/${newVal}/public` : '/var/www/myapp.com/public'
  }
})

const fetchSitesAndPHP = async () => {
  const headers = { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
  
  const [sitesRes, phpRes] = await Promise.all([
    fetch('/api/nginx/sites', { headers }),
    fetch('/api/php/versions', { headers })
  ])
  
  sites.value = await sitesRes.json()
  
  const phpData = await phpRes.json()
  phpVersionsList.value = phpData.map(p => p.version)
  if (phpVersionsList.value.length > 0) phpVersion.value = phpVersionsList.value[0]
}

const showSudoPrompt = ref(false)
const sudoError = ref('')
const currentSudoPassword = ref(null)
const sudoAction = ref('') // 'createSite' or 'issueSsl'
const currentDomainForSsl = ref('')

const handleSudoSubmit = (pwd) => {
  if (sudoAction.value === 'createSite') createSite(pwd)
  else if (sudoAction.value === 'issueSsl') issueSsl(currentDomainForSsl.value, pwd)
}

const issueSsl = async (domainToIssue, sudoPwd = null) => {
  if (typeof sudoPwd === 'string') currentSudoPassword.value = sudoPwd

  loading.value = true
  sudoError.value = ''
  sudoAction.value = 'issueSsl'
  currentDomainForSsl.value = domainToIssue

  const res = await fetch('/api/nginx/ssl', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    },
    body: JSON.stringify({ 
      domain: domainToIssue, 
      sudoPassword: currentSudoPassword.value
    })
  })
  
  const data = await res.json()

  if (res.status === 403 && data.error === 'SUDO_REQUIRED') {
    showSudoPrompt.value = true
    loading.value = false
    return
  }
  
  if (res.status === 403 && data.error === 'SUDO_INVALID') {
    sudoError.value = 'Incorrect sudo password.'
    showSudoPrompt.value = true
    loading.value = false
    currentSudoPassword.value = null
    return
  }

  showSudoPrompt.value = false
  loading.value = false
  if (res.ok) alert('SSL Issued Successfully!')
  else alert('Failed to issue SSL: ' + data.error)
}

const createSite = async (sudoPwd = null) => {
  sudoAction.value = 'createSite'
  if (typeof sudoPwd === 'string') currentSudoPassword.value = sudoPwd

  loading.value = true
  sudoError.value = ''

  const res = await fetch('/api/nginx/sites', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    },
    body: JSON.stringify({ 
      domain: domain.value, 
      type: type.value,
      port: port.value,
      documentRoot: documentRoot.value,
      phpVersion: phpVersion.value,
      sudoPassword: currentSudoPassword.value
    })
  })
  
  const data = await res.json()

  if (res.status === 403 && data.error === 'SUDO_REQUIRED') {
    showSudoPrompt.value = true
    loading.value = false
    return
  }
  
  if (res.status === 403 && data.error === 'SUDO_INVALID') {
    sudoError.value = 'Incorrect sudo password.'
    showSudoPrompt.value = true
    loading.value = false
    currentSudoPassword.value = null
    return
  }

  showSudoPrompt.value = false
  
  await fetchSitesAndPHP()
  domain.value = ''
  port.value = ''
  loading.value = false
}

onMounted(fetchSitesAndPHP)
</script>

<template>
  <div>
    <SudoPrompt 
      :isOpen="showSudoPrompt" 
      :error="sudoError" 
      @submit="handleSudoSubmit" 
      @cancel="showSudoPrompt = false; loading = false" 
    />
    <header class="mb-8">
      <h2 class="text-2xl font-bold tracking-tight text-white">Web Server (Nginx)</h2>
      <p class="text-gray-400 text-sm mt-1">Manage virtual hosts and reverse proxies.</p>
    </header>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div class="lg:col-span-2 bg-gray-950 border border-gray-800 rounded-xl shadow-sm overflow-hidden h-fit">
        <div class="px-6 py-4 border-b border-gray-800 bg-gray-900/50">
          <h3 class="text-sm font-semibold text-white">Active Virtual Hosts</h3>
        </div>
        <div class="p-0">
          <div v-if="sites.length === 0" class="text-gray-500 text-sm text-center py-6">No sites found.</div>
          <div v-for="site in sites" :key="site" class="flex items-center justify-between px-6 py-4 border-b border-gray-800 last:border-0 hover:bg-gray-900/50 transition-colors">
            <div class="flex items-center space-x-3">
              <svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"></path></svg>
              <h4 class="text-white font-medium text-sm">{{ site }}</h4>
            </div>
            <button @click="issueSsl(site.replace('.conf', ''))" class="text-xs font-medium text-green-400 bg-green-500/10 hover:bg-green-500/20 px-3 py-1.5 rounded border border-green-500/20 transition-colors">
              Issue SSL
            </button>
          </div>
        </div>
      </div>

      <div class="bg-gray-950 border border-gray-800 rounded-xl shadow-sm overflow-hidden h-fit">
        <div class="px-6 py-4 border-b border-gray-800 bg-gray-900/50">
          <h3 class="text-sm font-semibold text-white">New Host Configuration</h3>
        </div>
        <form @submit.prevent="createSite" class="p-6 space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-1">Domain Name</label>
            <input v-model="domain" type="text" placeholder="myapp.com" class="w-full bg-gray-950 border border-gray-800 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent transition-shadow" required />
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">Host Type</label>
            <div class="flex space-x-4">
              <label class="flex items-center space-x-2 text-gray-300 text-sm">
                <input type="radio" v-model="type" value="proxy" class="text-white focus:ring-white bg-gray-950 border-gray-700" />
                <span>Node App Proxy</span>
              </label>
              <label class="flex items-center space-x-2 text-gray-300 text-sm">
                <input type="radio" v-model="type" value="php" class="text-white focus:ring-white bg-gray-950 border-gray-700" />
                <span>PHP/Static Root</span>
              </label>
            </div>
          </div>

          <div v-if="type === 'proxy'">
            <label class="block text-sm font-medium text-gray-300 mb-1">Forward to Port</label>
            <input v-model="port" type="number" placeholder="3000" class="w-full bg-gray-950 border border-gray-800 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent transition-shadow" required />
          </div>

          <div v-if="type === 'php'">
            <label class="block text-sm font-medium text-gray-300 mb-1">Document Root</label>
            <input v-model="documentRoot" @input="hasManuallyEditedRoot = true" type="text" placeholder="/var/www/myapp/public" class="w-full bg-gray-950 border border-gray-800 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent transition-shadow" required />
            
            <label class="block text-sm font-medium text-gray-300 mb-1 mt-4">PHP Version</label>
            <select v-model="phpVersion" class="w-full bg-gray-950 border border-gray-800 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent transition-shadow" required>
              <option v-for="v in phpVersionsList" :key="v" :value="v">PHP {{ v }}</option>
            </select>
          </div>

          <button :disabled="loading" class="w-full bg-gray-800 hover:bg-gray-700 text-white text-sm font-medium py-2 rounded-md transition-colors disabled:opacity-50 mt-4">
            {{ loading ? 'Configuring...' : 'Create Config' }}
          </button>
        </form>
      </div>
    </div>
  </div>
</template>

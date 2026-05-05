<script setup>
import { ref, onMounted } from 'vue'

const versions = ref([])
const loading = ref(false)

const fetchVersions = async () => {
  const res = await fetch('/api/php/versions', {
    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
  })
  versions.value = await res.json()
}

const restartFpm = async (version) => {
  loading.value = true
  await fetch('/api/php/restart', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    },
    body: JSON.stringify({ version })
  })
  await fetchVersions()
  loading.value = false
}

onMounted(fetchVersions)
</script>

<template>
  <div>
    <header class="mb-8">
      <h2 class="text-2xl font-bold tracking-tight text-white">PHP-FPM Manager</h2>
      <p class="text-gray-400 text-sm mt-1">Manage installed PHP versions and FastCGI Process Managers.</p>
    </header>

    <div class="grid grid-cols-1 gap-8">
      <div class="bg-gray-950 border border-gray-800 rounded-xl shadow-sm overflow-hidden">
        <div class="px-6 py-4 border-b border-gray-800 bg-gray-900/50">
          <h3 class="text-sm font-semibold text-white">Installed PHP Versions</h3>
        </div>
        <div class="p-0">
          <div v-if="versions.length === 0" class="text-gray-500 text-sm py-6 text-center">No PHP versions detected.</div>
          
          <div v-for="php in versions" :key="php.version" class="flex items-center justify-between px-6 py-4 border-b border-gray-800 last:border-0 hover:bg-gray-900/50 transition-colors">
            <div class="flex items-center space-x-4">
              <div class="w-2 h-2 rounded-full" :class="php.status === 'online' ? 'bg-green-500' : 'bg-red-500'"></div>
              <div>
                <h4 class="text-white font-medium text-sm">PHP {{ php.version }}</h4>
                <p class="text-xs text-gray-400 mt-0.5">php{{ php.version }}-fpm</p>
              </div>
            </div>
            <div class="flex space-x-4">
              <button @click="restartFpm(php.version)" :disabled="loading" class="text-white hover:text-white bg-gray-800 border border-gray-700 hover:bg-gray-700 shadow-sm transition-colors font-medium text-xs px-3 py-1.5 rounded-md flex items-center gap-2 disabled:opacity-50">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                Restart FPM
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

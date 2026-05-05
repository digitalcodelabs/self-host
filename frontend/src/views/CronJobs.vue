<script setup>
import { ref, onMounted } from 'vue'

const jobs = ref([])
const schedule = ref('')
const command = ref('')
const loading = ref(false)

const fetchJobs = async () => {
  const res = await fetch('/api/cron', {
    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
  })
  jobs.value = await res.json()
}

const addJob = async () => {
  loading.value = true
  await fetch('/api/cron', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    },
    body: JSON.stringify({ schedule: schedule.value, command: command.value })
  })
  
  await fetchJobs()
  schedule.value = ''
  command.value = ''
  loading.value = false
}

onMounted(fetchJobs)
</script>

<template>
  <div>
    <header class="mb-8">
      <h2 class="text-2xl font-bold tracking-tight text-white">Cron Jobs</h2>
      <p class="text-gray-400 text-sm mt-1">Manage automated scheduled tasks.</p>
    </header>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div class="lg:col-span-2 bg-gray-950 border border-gray-800 rounded-xl shadow-sm overflow-hidden h-fit">
        <div class="px-6 py-4 border-b border-gray-800 bg-gray-900/50">
          <h3 class="text-sm font-semibold text-white">Current Crontab</h3>
        </div>
        <div class="p-0">
          <div v-if="jobs.length === 0" class="text-gray-500 text-sm py-6 text-center">No cron jobs found.</div>
          <div v-for="(job, index) in jobs" :key="index" class="px-6 py-4 border-b border-gray-800 last:border-0 hover:bg-gray-900/50 transition-colors">
            <div class="flex items-center space-x-4 mb-2">
              <span class="bg-gray-900 text-gray-300 text-xs px-2 py-1 rounded border border-gray-800">{{ job.schedule }}</span>
              <span class="text-gray-500 text-xs">Next run: {{ job.nextRun }}</span>
            </div>
            <code class="text-sm text-gray-300 bg-gray-900/50 block p-2 rounded border border-gray-800">{{ job.command }}</code>
          </div>
        </div>
      </div>

      <div class="bg-gray-950 border border-gray-800 rounded-xl shadow-sm overflow-hidden h-fit">
        <div class="px-6 py-4 border-b border-gray-800 bg-gray-900/50">
          <h3 class="text-sm font-semibold text-white">Add New Job</h3>
        </div>
        <form @submit.prevent="addJob" class="p-6 space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-1">Schedule (Cron syntax)</label>
            <input v-model="schedule" type="text" placeholder="* * * * *" class="w-full bg-gray-950 border border-gray-800 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent transition-shadow" required />
            <p class="text-xs text-gray-500 mt-1">e.g. 0 0 * * * (daily at midnight)</p>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-1">Command</label>
            <textarea v-model="command" rows="3" placeholder="/usr/bin/php /var/www/artisan schedule:run" class="w-full bg-gray-950 border border-gray-800 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent transition-shadow" required></textarea>
          </div>

          <button :disabled="loading" class="w-full bg-gray-800 hover:bg-gray-700 text-white text-sm font-medium py-2 rounded-md transition-colors disabled:opacity-50 mt-4">
            {{ loading ? 'Saving...' : 'Add Cron Job' }}
          </button>
        </form>
      </div>
    </div>
  </div>
</template>

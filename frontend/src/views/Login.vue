<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const username = ref('admin')
const password = ref('admin')
const error = ref('')
const loading = ref(false)

const login = async () => {
  error.value = ''
  loading.value = true
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: username.value, password: password.value })
    })
    const data = await res.json()
    if (res.ok) {
      localStorage.setItem('token', data.token)
      router.push('/')
    } else {
      error.value = data.error || 'Login failed'
    }
  } catch (err) {
    error.value = 'Failed to connect to server'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-950 px-4">
    <div class="w-full max-w-md p-8 bg-gray-950 border border-gray-800 rounded-xl shadow-sm">
      <div class="text-center mb-8">
        <svg class="w-12 h-12 text-white mx-auto mb-4 drop-shadow-md" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
        </svg>
        <p class="text-gray-400 text-sm mt-1">Sign in to your account</p>
      </div>

      <form @submit.prevent="login" class="space-y-4">
        <div v-if="error" class="bg-red-500/10 border border-red-500/50 text-red-500 p-3 rounded-md text-sm">
          {{ error }}
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-300 mb-1">Username</label>
          <input v-model="username" type="text" class="w-full bg-gray-950 border border-gray-800 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent transition-shadow" required />
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-300 mb-1">Password</label>
          <input v-model="password" type="password" class="w-full bg-gray-950 border border-gray-800 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent transition-shadow" required />
        </div>

        <button :disabled="loading" class="w-full mt-2 bg-gray-800 hover:bg-gray-700 text-white text-sm font-medium py-2 rounded-md transition-colors disabled:opacity-50">
          {{ loading ? 'Signing in...' : 'Sign In' }}
        </button>
      </form>
    </div>
    <div class="fixed bottom-6 text-center w-full">
      <p class="text-xs text-gray-500">
        Powered by <a href="https://digitalcodelabs.dev" target="_blank" class="text-gray-400 hover:text-white transition-colors">DigitalCodeLabs.dev</a>
      </p>
    </div>
  </div>
</template>

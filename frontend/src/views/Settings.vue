<script setup>
import { ref } from 'vue'

const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const message = ref('')
const error = ref('')
const loading = ref(false)

const changePassword = async () => {
  message.value = ''
  error.value = ''
  
  if (newPassword.value !== confirmPassword.value) {
    error.value = 'New passwords do not match'
    return
  }
  
  loading.value = true
  try {
    const res = await fetch('/api/auth/change-password', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ 
        currentPassword: currentPassword.value, 
        newPassword: newPassword.value 
      })
    })
    
    const data = await res.json()
    if (res.ok) {
      message.value = data.message
      currentPassword.value = ''
      newPassword.value = ''
      confirmPassword.value = ''
    } else {
      error.value = data.error || 'Failed to update password'
    }
  } catch (err) {
    error.value = 'Failed to connect to server'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div>
    <header class="mb-8">
      <h2 class="text-2xl font-bold tracking-tight text-white">Settings</h2>
      <p class="text-gray-400 text-sm mt-1">Manage your administrator account.</p>
    </header>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div class="bg-gray-950 border border-gray-800 rounded-xl shadow-sm overflow-hidden h-fit">
        <div class="px-6 py-4 border-b border-gray-800 bg-gray-900/50">
          <h3 class="text-sm font-semibold text-white">Change Password</h3>
        </div>
        <form @submit.prevent="changePassword" class="p-6 space-y-4">
          <div v-if="error" class="bg-red-500/10 border border-red-500/50 text-red-500 p-3 rounded-md text-sm">
            {{ error }}
          </div>
          <div v-if="message" class="bg-green-500/10 border border-green-500/50 text-green-500 p-3 rounded-md text-sm">
            {{ message }}
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-1">Current Password</label>
            <input v-model="currentPassword" type="password" class="w-full bg-gray-950 border border-gray-800 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white transition-shadow" required />
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-1">New Password</label>
            <input v-model="newPassword" type="password" class="w-full bg-gray-950 border border-gray-800 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white transition-shadow" required minlength="5" />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-300 mb-1">Confirm New Password</label>
            <input v-model="confirmPassword" type="password" class="w-full bg-gray-950 border border-gray-800 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white transition-shadow" required minlength="5" />
          </div>

          <button :disabled="loading" class="w-full bg-gray-800 hover:bg-gray-700 text-white text-sm font-medium py-2 rounded-md transition-colors disabled:opacity-50 mt-4">
            {{ loading ? 'Updating...' : 'Update Password' }}
          </button>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps(['isOpen', 'error'])
const emit = defineEmits(['submit', 'cancel'])

const password = ref('')

const onSubmit = () => {
  emit('submit', password.value)
  password.value = ''
}
</script>

<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
    <div class="bg-gray-950 border border-gray-800 rounded-xl p-6 w-full max-w-sm shadow-2xl">
      <h3 class="text-lg font-bold text-white mb-2">Sudo Privileges Required</h3>
      <p class="text-sm text-gray-400 mb-4">This action requires elevated permissions on the server. Please enter your sudo password.</p>
      
      <div v-if="error" class="mb-4 text-xs text-red-500 bg-red-500/10 p-2 rounded border border-red-500/20">
        {{ error }}
      </div>

      <form @submit.prevent="onSubmit">
        <input v-model="password" type="password" placeholder="Password" class="w-full bg-gray-900 border border-gray-800 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white mb-4" required autofocus />
        <div class="flex justify-end gap-3">
          <button type="button" @click="$emit('cancel')" class="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">Cancel</button>
          <button type="submit" class="px-4 py-2 text-sm bg-gray-800 text-white font-medium rounded-md hover:bg-gray-700 transition-colors">Authenticate</button>
        </div>
      </form>
    </div>
  </div>
</template>

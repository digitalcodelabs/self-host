<template>
  <div class="max-w-6xl mx-auto space-y-8 relative">
    <header class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h2 class="text-2xl font-bold tracking-tight text-white">Databases</h2>
        <p class="text-gray-400 text-sm mt-1">Manage MariaDB databases and users.</p>
      </div>
      <div class="flex items-center gap-3">
        <button @click="restartMariaDb()" :disabled="restartingDb" class="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 border border-gray-700">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" :class="{'animate-spin': restartingDb}"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
          {{ restartingDb ? 'Restarting...' : 'Restart MariaDB' }}
        </button>
        <button @click="showCreateDbModal = true" class="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
          Create Database
        </button>
        <button @click="showCreateUserModal = true" class="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2 shadow-lg shadow-blue-500/20">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"></path></svg>
          Create User
        </button>
      </div>
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

    <div class="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
      <!-- Databases List -->
      <div class="bg-gray-950 border border-gray-800 rounded-xl overflow-hidden shadow-sm">
        <div class="px-6 py-4 border-b border-gray-800 bg-gray-900/50 flex justify-between items-center">
          <h3 class="text-sm font-semibold text-white">Existing Databases</h3>
          <button @click="loadDatabases" class="text-gray-400 hover:text-white transition-colors" title="Refresh">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
          </button>
        </div>
        <div class="p-0">
          <div v-if="loading" class="text-gray-500 text-sm text-center py-6">Loading databases...</div>
          <div v-else-if="databases.length === 0" class="text-gray-500 text-sm text-center py-6">No databases found.</div>
          <div v-else v-for="db in databases" :key="db" class="flex items-center space-x-3 px-6 py-4 border-b border-gray-800 last:border-0 hover:bg-gray-900/50 transition-colors">
            <svg class="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"></path></svg>
            <h4 class="text-white font-medium text-sm">{{ db }}</h4>
          </div>
        </div>
      </div>

      <!-- Users List -->
      <div class="bg-gray-950 border border-gray-800 rounded-xl overflow-hidden shadow-sm">
        <div class="px-6 py-4 border-b border-gray-800 bg-gray-900/50 flex justify-between items-center">
          <h3 class="text-sm font-semibold text-white">Database Users</h3>
          <button @click="loadDatabases" class="text-gray-400 hover:text-white transition-colors" title="Refresh">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
          </button>
        </div>
        <div class="p-0">
          <div v-if="loading" class="text-gray-500 text-sm text-center py-6">Loading users...</div>
          <div v-else-if="users.length === 0" class="text-gray-500 text-sm text-center py-6">No users found.</div>
          <div v-else v-for="user in users" :key="user.username + user.host" class="flex items-center justify-between px-6 py-4 border-b border-gray-800 last:border-0 hover:bg-gray-900/50 transition-colors">
            <div class="flex items-center space-x-3">
              <div class="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                <svg class="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
              </div>
              <div>
                <h4 class="text-white font-medium text-sm">{{ user.username }}</h4>
                <p class="text-xs text-gray-500">@{{ user.host }}</p>
              </div>
            </div>
            <button @click="deleteUser(user.username, user.host)" class="text-red-400 hover:text-red-300 p-2 transition-colors rounded-lg hover:bg-red-500/10" title="Delete User">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Create Database Modal -->
    <div v-if="showCreateDbModal" class="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div class="bg-gray-950 border border-gray-800 rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <h3 class="text-lg font-bold text-white mb-2">Create Database</h3>
        <p class="text-sm text-gray-400 mb-6">Create a new empty MariaDB database.</p>
        
        <form @submit.prevent="createDb" class="space-y-4">
          <div>
            <label class="block text-xs font-medium text-gray-400 mb-1">Database Name</label>
            <input v-model="newDbName" type="text" class="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all" required pattern="[a-zA-Z0-9_]+" autofocus placeholder="my_database" />
          </div>
          <div class="flex justify-end gap-3 pt-2">
            <button type="button" @click="showCreateDbModal = false" class="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">Cancel</button>
            <button type="submit" :disabled="creatingDb" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 shadow-lg shadow-indigo-600/20">
              {{ creatingDb ? 'Creating...' : 'Create Database' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Create User Modal -->
    <div v-if="showCreateUserModal" class="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div class="bg-gray-950 border border-gray-800 rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <h3 class="text-lg font-bold text-white mb-2">Create Database & User</h3>
        <p class="text-sm text-gray-400 mb-6">Provision a new user and grant them privileges to a specific database.</p>
        
        <form @submit.prevent="createUser" class="space-y-4">
          <div>
            <label class="block text-xs font-medium text-gray-400 mb-1">Database Name</label>
            <input v-model="userDbName" type="text" class="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all" required pattern="[a-zA-Z0-9_]+" placeholder="Target database (created if missing)" />
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-400 mb-1">Username</label>
            <input v-model="newUsername" type="text" class="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all" required pattern="[a-zA-Z0-9_]+" placeholder="db_user" />
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-400 mb-1">Password</label>
            <input v-model="newUserPassword" type="password" class="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all" required placeholder="••••••••" />
          </div>
          <div class="flex justify-end gap-3 pt-2">
            <button type="button" @click="showCreateUserModal = false" class="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">Cancel</button>
            <button type="submit" :disabled="creatingUser" class="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 shadow-lg shadow-blue-500/20">
              {{ creatingUser ? 'Creating...' : 'Create User' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <SudoPrompt :isOpen="showSudoPrompt" @cancel="showSudoPrompt = false" @submit="handleSudoSubmit" :error="sudoError" />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import SudoPrompt from '../components/SudoPrompt.vue'

const databases = ref([])
const users = ref([])
const loading = ref(true)

const message = ref('')
const messageType = ref('success')
const restartingDb = ref(false)

const showCreateDbModal = ref(false)
const showCreateUserModal = ref(false)

const newDbName = ref('')
const creatingDb = ref(false)

const userDbName = ref('')
const newUsername = ref('')
const newUserPassword = ref('')
const creatingUser = ref(false)

const showSudoPrompt = ref(false)
const sudoError = ref('')
const currentSudoPassword = ref(null)
const sudoAction = ref('')
const currentDeleteArgs = ref({ username: '', host: '' })

onMounted(() => {
  loadDatabases()
})

const handleSudoSubmit = (pwd) => {
  currentSudoPassword.value = pwd
  if (sudoAction.value === 'loadDatabases') loadDatabases(pwd)
  else if (sudoAction.value === 'createDb') createDb(pwd)
  else if (sudoAction.value === 'createUser') createUser(pwd)
  else if (sudoAction.value === 'deleteUser') deleteUser(currentDeleteArgs.value.username, currentDeleteArgs.value.host, pwd)
  else if (sudoAction.value === 'restartMariaDb') restartMariaDb(pwd)
}

const loadDatabases = async (sudoPwd = null) => {
  sudoAction.value = 'loadDatabases'
  loading.value = true
  sudoError.value = ''
  
  try {
    const res = await fetch('/api/databases', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ action: 'list', sudoPassword: sudoPwd || currentSudoPassword.value })
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
    if (res.ok) {
      databases.value = data.databases || []
      users.value = data.users || []
    } else {
      alert('Failed to load databases: ' + data.error)
    }
  } catch (error) {
    loading.value = false
    alert('An error occurred while loading databases.')
  }
}

const createDb = async (sudoPwd = null) => {
  sudoAction.value = 'createDb'
  creatingDb.value = true
  sudoError.value = ''
  
  try {
    const res = await fetch('/api/databases', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ action: 'create_db', dbName: newDbName.value, sudoPassword: sudoPwd || currentSudoPassword.value })
    })
    const data = await res.json()
    
    if (res.status === 403 && data.error === 'SUDO_REQUIRED') {
      showSudoPrompt.value = true
      creatingDb.value = false
      return
    }
    if (res.status === 403 && data.error === 'SUDO_INVALID') {
      sudoError.value = 'Incorrect sudo password.'
      showSudoPrompt.value = true
      creatingDb.value = false
      currentSudoPassword.value = null
      return
    }

    showSudoPrompt.value = false
    creatingDb.value = false
    if (res.ok) {
      newDbName.value = ''
      showCreateDbModal.value = false
      loadDatabases(sudoPwd || currentSudoPassword.value)
    } else {
      alert('Failed to create database: ' + data.error)
    }
  } catch (error) {
    creatingDb.value = false
    alert('An error occurred while creating database.')
  }
}

const createUser = async (sudoPwd = null) => {
  sudoAction.value = 'createUser'
  creatingUser.value = true
  sudoError.value = ''
  
  try {
    const res = await fetch('/api/databases', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ 
        action: 'create_user', 
        dbName: userDbName.value,
        username: newUsername.value,
        password: newUserPassword.value,
        sudoPassword: sudoPwd || currentSudoPassword.value 
      })
    })
    const data = await res.json()
    
    if (res.status === 403 && data.error === 'SUDO_REQUIRED') {
      showSudoPrompt.value = true
      creatingUser.value = false
      return
    }
    if (res.status === 403 && data.error === 'SUDO_INVALID') {
      sudoError.value = 'Incorrect sudo password.'
      showSudoPrompt.value = true
      creatingUser.value = false
      currentSudoPassword.value = null
      return
    }

    showSudoPrompt.value = false
    creatingUser.value = false
    if (res.ok) {
      userDbName.value = ''
      newUsername.value = ''
      newUserPassword.value = ''
      showCreateUserModal.value = false
      loadDatabases(sudoPwd || currentSudoPassword.value)
      alert('Database and User created successfully!')
    } else {
      alert('Failed to create user: ' + data.error)
    }
  } catch (error) {
    creatingUser.value = false
    alert('An error occurred while creating user.')
  }
}

const deleteUser = async (username, host, sudoPwd = null) => {
  if (!sudoPwd && !confirm(`Are you sure you want to delete user ${username}@${host}?`)) return;
  
  sudoAction.value = 'deleteUser'
  sudoError.value = ''
  
  try {
    const res = await fetch('/api/databases', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ 
        action: 'delete_user', 
        username, 
        host,
        sudoPassword: sudoPwd || currentSudoPassword.value 
      })
    })
    const data = await res.json()
    
    if (res.status === 403 && data.error === 'SUDO_REQUIRED') {
      currentDeleteArgs.value = { username, host }
      showSudoPrompt.value = true
      return
    }
    if (res.status === 403 && data.error === 'SUDO_INVALID') {
      sudoError.value = 'Incorrect sudo password.'
      showSudoPrompt.value = true
      currentSudoPassword.value = null
      return
    }

    showSudoPrompt.value = false
    if (res.ok) {
      loadDatabases(sudoPwd || currentSudoPassword.value)
    } else {
      alert('Failed to delete user: ' + data.error)
    }
  } catch (error) {
    alert('An error occurred while deleting user.')
  }
}

const restartMariaDb = async (sudoPwd = null) => {
  sudoAction.value = 'restartMariaDb'
  restartingDb.value = true
  message.value = ''
  sudoError.value = ''
  
  try {
    const res = await fetch('/api/databases', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ 
        action: 'restart', 
        sudoPassword: sudoPwd || currentSudoPassword.value 
      })
    })
    const data = await res.json()
    
    if (res.status === 403 && data.error === 'SUDO_REQUIRED') {
      showSudoPrompt.value = true
      restartingDb.value = false
      return
    }
    if (res.status === 403 && data.error === 'SUDO_INVALID') {
      sudoError.value = 'Incorrect sudo password.'
      showSudoPrompt.value = true
      restartingDb.value = false
      currentSudoPassword.value = null
      return
    }

    showSudoPrompt.value = false
    if (res.ok) {
      messageType.value = 'success'
      message.value = 'MariaDB service restarted successfully.'
    } else {
      messageType.value = 'error'
      message.value = `Failed to restart MariaDB: ${data.error || 'Unknown error'}`
    }
  } catch (error) {
    messageType.value = 'error'
    message.value = 'An error occurred while restarting MariaDB.'
  } finally {
    restartingDb.value = false
    
    if (messageType.value === 'success') {
      setTimeout(() => {
        message.value = ''
      }, 5000)
    }
  }
}
</script>

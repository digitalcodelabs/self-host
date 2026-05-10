<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()
const version = import.meta.env.VITE_APP_VERSION || 'v1.0'

const logout = () => {
  localStorage.removeItem('token')
  router.push('/login')
}
</script>

<template>
  <div class="min-h-screen flex bg-gray-950 text-white overflow-hidden">
    <!-- Sidebar -->
    <aside class="w-64 bg-gray-950 border-r border-gray-800 hidden md:flex flex-col h-screen">
      <div class="p-6 flex items-center justify-center">
        <svg class="w-10 h-10 text-white drop-shadow-md" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
        </svg>
        <div class="flex flex-col ml-2">
          <span class="text-xl font-bold leading-tight tracking-tight">dcl-panel</span>
          <span class="text-[10px] font-semibold text-indigo-400 tracking-widest uppercase mt-0.5">{{ version }}</span>
        </div>
      </div>
      <nav class="mt-2 px-3 space-y-1 flex-1">
        <router-link to="/" class="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-gray-400 hover:bg-gray-800 hover:text-white transition-colors" exact-active-class="bg-gray-800 text-white font-medium">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg>
          Dashboard
        </router-link>
        
        <router-link to="/webserver" class="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-gray-400 hover:bg-gray-800 hover:text-white transition-colors" exact-active-class="bg-gray-800 text-white font-medium">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"></path></svg>
          Web Server
        </router-link>

        <router-link to="/php" class="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-gray-400 hover:bg-gray-800 hover:text-white transition-colors" exact-active-class="bg-gray-800 text-white font-medium">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path></svg>
          PHP-FPM
        </router-link>

        <router-link to="/databases" class="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-gray-400 hover:bg-gray-800 hover:text-white transition-colors" exact-active-class="bg-gray-800 text-white font-medium">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"></path></svg>
          Databases
        </router-link>

        <router-link to="/cron" class="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-gray-400 hover:bg-gray-800 hover:text-white transition-colors" exact-active-class="bg-gray-800 text-white font-medium">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          Cron Jobs
        </router-link>
        
        <router-link to="/deployments" class="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-gray-400 hover:bg-gray-800 hover:text-white transition-colors" exact-active-class="bg-gray-800 text-white font-medium">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"></path></svg>
          Deployments
        </router-link>

        <router-link to="/settings" class="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-gray-400 hover:bg-gray-800 hover:text-white transition-colors" exact-active-class="bg-gray-800 text-white font-medium">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
          Settings
        </router-link>

      </nav>
      <div class="p-4 border-t border-gray-800 flex flex-col gap-2">
        <button @click="logout" class="text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-2 w-full px-2 py-1.5 rounded-md hover:bg-gray-800">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
          Logout
        </button>
        <a href="https://digitalcodelabs.dev" target="_blank" rel="noopener" class="group flex items-center justify-center gap-1.5 w-full px-2 py-2 rounded-md bg-gradient-to-r from-blue-600/10 to-indigo-600/10 border border-blue-500/20 hover:border-blue-500/40 hover:from-blue-600/20 hover:to-indigo-600/20 transition-all duration-300">
          <span class="text-[11px] font-medium text-gray-400 group-hover:text-gray-300">Powered by</span>
          <span class="text-[11px] font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent group-hover:from-blue-300 group-hover:to-indigo-300 transition-colors tracking-wide">DigitalCodeLabs</span>
        </a>
      </div>
    </aside>

    <!-- Main Content -->
    <main class="flex-1 p-8 overflow-y-auto h-screen">
      <div class="max-w-6xl mx-auto">
        <router-view />
      </div>
    </main>
  </div>
</template>

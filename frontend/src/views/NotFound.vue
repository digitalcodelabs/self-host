<template>
  <div class="min-h-screen bg-black flex flex-col items-center justify-center p-4">
    <div class="text-center relative">
      <!-- Glow effect -->
      <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -z-10"></div>
      
      <h1 class="text-9xl font-black text-gray-900 drop-shadow-sm">404</h1>
      <h2 class="text-2xl font-bold text-white mt-4 tracking-tight">Page Not Found</h2>
      <p class="text-gray-400 mt-2 mb-8 max-w-sm mx-auto">
        The page you are looking for doesn't exist or has been moved.
      </p>
      
      <router-link to="/" class="inline-flex items-center gap-2 px-6 py-3 bg-white hover:bg-gray-200 text-black text-sm font-medium rounded-lg transition-colors shadow-lg shadow-white/5">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
        Return to Dashboard
      </router-link>
    </div>
  </div>
</template>

<script setup>
// NotFound component
</script>

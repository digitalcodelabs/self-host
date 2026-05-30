import { createApp } from 'vue'
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/500.css';
import '@fontsource/jetbrains-mono/600.css';
import '@fontsource/jetbrains-mono/700.css';
import './style.css'
import App from './App.vue'
import router from './router'
import { setAuthToken } from './utils/auth'

// Intercept all fetch requests globally to handle session expiration/invalidation
const originalFetch = window.fetch;
window.fetch = async (...args) => {
  const response = await originalFetch(...args);
  if (response.status === 401 || response.status === 403) {
    const url = typeof args[0] === 'string' ? args[0] : (args[0] && args[0].url);
    if (url && !url.includes('/api/auth/login')) {
      setAuthToken(null);
      if (router.currentRoute.value.name !== 'Login') {
        router.push('/login');
      }
    }
  }
  return response;
};

createApp(App).use(router).mount('#app')

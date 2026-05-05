import { createApp } from 'vue'
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/500.css';
import '@fontsource/jetbrains-mono/600.css';
import '@fontsource/jetbrains-mono/700.css';
import './style.css'
import App from './App.vue'
import router from './router'

createApp(App).use(router).mount('#app')

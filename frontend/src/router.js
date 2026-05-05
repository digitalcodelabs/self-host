import { createRouter, createWebHistory } from 'vue-router'
import Login from './views/Login.vue'
import Layout from './components/Layout.vue'
import Dashboard from './views/Dashboard.vue'
import Deployments from './views/Deployments.vue'
import WebServer from './views/WebServer.vue'
import CronJobs from './views/CronJobs.vue'
import Databases from './views/Databases.vue'
import PhpManager from './views/PhpManager.vue'
import Settings from './views/Settings.vue'
import NotFound from './views/NotFound.vue'

const routes = [
  { path: '/login', component: Login, name: 'Login' },
  { 
    path: '/', 
    component: Layout,
    meta: { requiresAuth: true },
    children: [
      { path: '', component: Dashboard, name: 'Dashboard' },
      { path: 'deployments', component: Deployments, name: 'Deployments' },
      { path: 'webserver', component: WebServer, name: 'WebServer' },
      { path: 'cron', component: CronJobs, name: 'CronJobs' },
      { path: 'php', component: PhpManager, name: 'PhpManager' },
      { path: 'databases', component: Databases, name: 'Databases' },
      { path: 'settings', component: Settings, name: 'Settings' }
    ]
  },
  { path: '/:pathMatch(.*)*', component: NotFound, name: 'NotFound' }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const isAuthenticated = !!localStorage.getItem('token')
  if (to.meta.requiresAuth && !isAuthenticated) {
    next('/login')
  } else if (to.name === 'Login' && isAuthenticated) {
    next('/')
  } else {
    next()
  }
})

export default router

import { createRouter, createWebHistory } from '@ionic/vue-router'
import TabsPage from '@/views/TabsPage.vue'

const routes = [
  {
    path: '/',
    redirect: '/tabs/gallery'
  },
  {
    path: '/tabs/',
    component: TabsPage,
    children: [
      {
        path: 'gallery',
        component: () => import('@/views/GalleryPage.vue')
      },
      {
        path: 'report',
        component: () => import('@/views/ReportPage.vue')
      },
      {
        path: '',
        redirect: '/tabs/gallery'
      }
    ]
  }
]

export default createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

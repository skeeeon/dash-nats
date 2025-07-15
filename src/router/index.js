import { createRouter, createWebHistory } from 'vue-router';

/**
 * Vue Router configuration for NATS Dashboard
 * Defines application routes and navigation structure
 */

// Lazy-loaded views for better performance
const Dashboard = () => import('@/views/Dashboard.vue');
const Settings = () => import('@/views/Settings.vue');
const About = () => import('@/views/About.vue');
const Connections = () => import('@/views/Connections.vue');

/**
 * Route definitions
 */
const routes = [
  {
    path: '/',
    name: 'home',
    redirect: { name: 'dashboard' }
  },
  {
    path: '/dashboard/:id?',
    name: 'dashboard',
    component: Dashboard,
    meta: {
      title: 'Dashboard',
      description: 'NATS Dashboard with configurable cards',
      requiresConnection: false // Can view dashboard without connection
    }
  },
  {
    path: '/connections',
    name: 'connections',
    component: Connections,
    meta: {
      title: 'Connection Settings',
      description: 'Configure NATS server connections',
      requiresConnection: false
    }
  },
  {
    path: '/settings',
    name: 'settings',
    component: Settings,
    meta: {
      title: 'Settings',
      description: 'Application settings and preferences',
      requiresConnection: false
    }
  },
  {
    path: '/about',
    name: 'about',
    component: About,
    meta: {
      title: 'About',
      description: 'About NATS Dashboard',
      requiresConnection: false
    }
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    redirect: { name: 'dashboard' }
  }
];

/**
 * Create router instance
 */
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  
  // Scroll behavior for better UX
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition;
    } else if (to.hash) {
      return {
        el: to.hash,
        behavior: 'smooth',
      };
    } else {
      return { top: 0 };
    }
  }
});

/**
 * Global navigation guards
 */

// Before each route
router.beforeEach(async (to, from, next) => {
  // Set document title
  if (to.meta?.title) {
    document.title = `${to.meta.title} - NATS Dashboard`;
  } else {
    document.title = 'NATS Dashboard';
  }
  
  // Update meta description
  updateMetaDescription(to.meta?.description);
  
  // Log navigation for debugging
  console.log(`[Router] Navigating from ${from.name || from.path} to ${to.name || to.path}`);
  
  // Continue with navigation
  next();
});

// After each route
router.afterEach((to, from) => {
  // Track navigation for analytics (if needed)
  console.log(`[Router] Navigation complete: ${to.name || to.path}`);
});

// Error handling
router.onError((error) => {
  console.error('[Router] Navigation error:', error);
  
  // Navigate to dashboard on route errors
  if (router.currentRoute.value.name !== 'dashboard') {
    router.push({ name: 'dashboard' });
  }
});

/**
 * Helper function to update meta description
 */
function updateMetaDescription(description) {
  if (!description) return;
  
  let metaDescription = document.querySelector('meta[name="description"]');
  
  if (!metaDescription) {
    metaDescription = document.createElement('meta');
    metaDescription.name = 'description';
    document.head.appendChild(metaDescription);
  }
  
  metaDescription.content = description;
}

/**
 * Navigation helper functions
 */

/**
 * Navigate to dashboard
 * @param {string} dashboardId - Optional dashboard ID
 */
export function navigateToDashboard(dashboardId = null) {
  const route = { name: 'dashboard' };
  if (dashboardId) {
    route.params = { id: dashboardId };
  }
  return router.push(route);
}

/**
 * Navigate to connection settings
 */
export function navigateToConnections() {
  return router.push({ name: 'connections' });
}

/**
 * Navigate to settings
 */
export function navigateToSettings() {
  return router.push({ name: 'settings' });
}

/**
 * Check if current route matches
 * @param {string} routeName - Route name to check
 * @returns {boolean} Match status
 */
export function isCurrentRoute(routeName) {
  return router.currentRoute.value.name === routeName;
}

/**
 * Get current route information
 * @returns {Object} Current route data
 */
export function getCurrentRoute() {
  const route = router.currentRoute.value;
  return {
    name: route.name,
    path: route.path,
    params: route.params,
    query: route.query,
    meta: route.meta
  };
}

export default router;

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import svgr from 'vite-plugin-svgr';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  const isProd = mode === 'production';
  
  return {
    plugins: [
      react(),
      tailwindcss(),
      svgr({
        // Add SVG optimization options
        svgrOptions: {
          svgo: true,
          svgoConfig: {
            plugins: [
              {
                name: 'preset-default',
                params: {
                  overrides: {
                    // Enable minimization options
                    removeViewBox: false,
                    cleanupIDs: true,
                  },
                },
              },
            ],
          },
        },
      }),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: [
          'favicon.svg', 
          'favicon.ico', 
          'robots.txt', 
          'apple-touch-icon.png',
          'favicon/favicon-96x96.png',
          'favicon/favicon.svg',
          'favicon/apple-touch-icon.png'
        ],
        manifest: {
          name: 'GNT – Next-Gen Console & PC Marketplace',
          short_name: 'GNT',
          description: 'Explore the future of gaming tech with GNT – Your go-to marketplace for consoles and computers.',
          theme_color: '#3f4354',
          background_color: '#000000',
          display: 'standalone',
          start_url: '/',
          orientation: 'portrait',
          categories: ['shopping', 'games', 'technology'],
          screenshots: [
            {
              src: '/screenshots/home-screenshot.png',
              sizes: '1280x720',
              type: 'image/png',
              label: 'GNT Home Screen'
            },
            {
              src: '/screenshots/product-screenshot.png',
              sizes: '1280x720',
              type: 'image/png',
              label: 'Product Details'
            }
          ],
          icons: [
            {
              src: '/icons/icon-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: '/icons/icon-192x192-maskable.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'maskable'
            },
            {
              src: '/icons/icon-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: '/icons/icon-512x512-maskable.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable'
            }
          ]
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,png,jpg,jpeg,gif,webp,woff,woff2,ttf,eot}'],
          runtimeCaching: [
            {
              urlPattern: ({ request }) => request.destination === 'document',
              handler: 'NetworkFirst',
              options: {
                cacheName: 'html-cache',
                cacheableResponse: {
                  statuses: [0, 200]
                },
                networkTimeoutSeconds: 3
              },
            },
            {
              urlPattern: ({ request }) => ['style', 'script', 'worker'].includes(request.destination),
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'static-resources',
                cacheableResponse: {
                  statuses: [0, 200]
                },
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 60 * 60 * 24 * 7 // 7 days
                }
              },
            },
            {
              urlPattern: ({ request }) => request.destination === 'image',
              handler: 'CacheFirst',
              options: {
                cacheName: 'image-cache',
                cacheableResponse: {
                  statuses: [0, 200]
                },
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
                },
              },
            },
            {
              urlPattern: /\/api\/.*/i,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'api-cache',
                cacheableResponse: {
                  statuses: [0, 200]
                },
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 60 * 60 // 1 hour
                }
              }
            },
            {
              urlPattern: ({ url }) => url.origin === 'https://fonts.googleapis.com' || 
                                      url.origin === 'https://fonts.gstatic.com',
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'google-fonts',
                expiration: {
                  maxEntries: 30,
                  maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
                }
              }
            }
          ],
        },
        devOptions: {
          enabled: !isProd ? true : false,
          type: 'module'
        }
      })
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        process: 'process/browser',
      },
    },
    define: {
      'process.env': {},
    },
    build: {
      // Enable minification for production builds
      minify: isProd ? 'terser' : false,
      terserOptions: {
        compress: {
          drop_console: isProd,
          drop_debugger: isProd
        }
      },
      // Set chunk size warning limit correctly
      chunkSizeWarningLimit: 800,
      // Improve chunk splitting
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            // React and related packages
            if (id.includes('node_modules/react/') || 
                id.includes('node_modules/react-dom/') || 
                id.includes('node_modules/react-router-dom/')) {
              return 'react-vendor';
            }
            
            // UI component libraries
            if (id.includes('node_modules/@radix-ui/')) {
              return 'ui-components';
            }
            
            // Lucide icons
            if (id.includes('node_modules/lucide-react/')) {
              return 'lucide';
            }
            
            // Markdown related
            if (id.includes('node_modules/react-markdown')) {
              return 'markdown';
            }
            
            // Animation libraries
            if (id.includes('node_modules/framer-motion')) {
              return 'motion';
            }
            
            // Data fetching libraries
            if (id.includes('node_modules/@supabase/') || 
                id.includes('node_modules/@tanstack/react-query') || 
                id.includes('node_modules/appwrite')) {
              return 'data-fetching';
            }
            
            // Utility libraries
            if (id.includes('node_modules/tailwind-merge') || 
                id.includes('node_modules/uuid') || 
                id.includes('node_modules/sonner') || 
                id.includes('node_modules/embla-carousel')) {
              return 'utils';
            }

            // Additional chunking for app code
            if (id.includes('/src/components/')) {
              return 'components';
            }
            
            if (id.includes('/src/pages/')) {
              return 'pages';
            }
            
            if (id.includes('/src/context/')) {
              return 'context';
            }
          }
        }
      },
      // Generate source maps only in development
      sourcemap: !isProd
    },
    server: {
      proxy: {
        '/api': {
          target: 'http://localhost:52921',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, '')
        }
      },
      allowedHosts: ['gntapp.loca.lt', '98ba-103-49-113-87.ngrok-free.app']
    }
  };
});
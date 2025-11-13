import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
    // This is the key change. We tell Vite to find the VITE_API_KEY from the environment
    // and make it available in our code as process.env.API_KEY.
    // Vite security requires environment variables to be prefixed with VITE_ to be exposed to the client.
    define: {
      'process.env.API_KEY': JSON.stringify(env.VITE_API_KEY)
    }
  }
})

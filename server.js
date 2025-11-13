import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

// Since 'type': 'module' is in package.json, we use ES module syntax
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
// Replit provides the PORT environment variable
const port = process.env.PORT || 5000;

// Serve static files from the 'dist' directory, which is Vite's build output
app.use(express.static(path.join(__dirname, 'dist')));

// For any request that doesn't match a static file, serve index.html
// This is crucial for single-page applications like React to handle client-side routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
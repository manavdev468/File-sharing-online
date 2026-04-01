const express = require('express');
const cors = require('cors');
const multer = require('multer');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');
const os = require('os');

const app = express();
const server = http.createServer(app);
const PORT = 3001;

// Socket.io with permissive CORS
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "DELETE"]
  }
});

// Middleware
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type"]
}));
app.use(express.json());

// Create uploads directory
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Serve uploaded files
app.use('/uploads', express.static(uploadsDir));

// Multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 500 * 1024 * 1024 }
});

// In-memory storage for shared items
const dataFile = path.join(__dirname, 'shared-items.json');
let sharedItems = [];

if (fs.existsSync(dataFile)) {
  try {
    sharedItems = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
    console.log(`📂 Loaded ${sharedItems.length} existing items`);
  } catch (e) {
    sharedItems = [];
  }
}

function saveItems() {
  fs.writeFileSync(dataFile, JSON.stringify(sharedItems, null, 2));
}

// Get best network IP
function getBestIP() {
  const interfaces = os.networkInterfaces();
  const virtualKeywords = ['virtualbox', 'vmware', 'vmnet', 'vbox', 'docker', 'hyper-v', 'wsl'];
  const virtualIPRanges = ['192.168.56.', '192.168.99.', '172.17.', '172.18.', '10.0.75.'];
  
  for (const [name, addresses] of Object.entries(interfaces)) {
    const lowerName = name.toLowerCase();
    if (virtualKeywords.some(k => lowerName.includes(k))) continue;
    
    for (const addr of addresses) {
      if (addr.family === 'IPv4' && !addr.internal) {
        if (!virtualIPRanges.some(r => addr.address.startsWith(r))) {
          return addr.address;
        }
      }
    }
  }
  return 'localhost';
}

// ============================================
// FULL GRAVITYSHARE WEB APP (EMBEDDED HTML)
// ============================================
app.get('/', (req, res) => {
  const serverHost = req.headers.host;
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>GravityShare - Local File Sharing</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="/socket.io/socket.io.js"></script>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * { font-family: 'Inter', sans-serif; }
    .gradient-bg {
      background: linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%);
    }
    .glass {
      background: rgba(255, 255, 255, 0.05);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.1);
    }
    .drop-zone.dragover {
      border-color: #8b5cf6;
      background: rgba(139, 92, 246, 0.1);
      transform: scale(1.02);
    }
    .file-item {
      animation: slideIn 0.3s ease-out;
    }
    @keyframes slideIn {
      from { opacity: 0; transform: translateY(-10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .toast {
      animation: toastIn 0.3s ease-out;
    }
    @keyframes toastIn {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    ::-webkit-scrollbar { width: 8px; }
    ::-webkit-scrollbar-track { background: rgba(255,255,255,0.05); }
    ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 4px; }
  </style>
</head>
<body class="gradient-bg min-h-screen text-white">
  <div id="app" class="min-h-screen"></div>

  <script>
    // State
    let items = [];
    let connectedDevices = 1;
    let filter = 'all';
    let textInput = '';
    let toasts = [];
    let socket = null;

    const serverUrl = window.location.origin;

    // Initialize Socket.io
    function initSocket() {
      socket = io(serverUrl);
      
      socket.on('connect', () => {
        console.log('Connected to server');
        showToast('Connected to GravityShare', 'success');
      });

      socket.on('initial-items', (serverItems) => {
        items = serverItems;
        render();
      });

      socket.on('item-added', (item) => {
        if (!items.find(i => i.id === item.id)) {
          items.unshift(item);
          render();
        }
      });

      socket.on('item-deleted', (id) => {
        items = items.filter(i => i.id !== id);
        render();
      });

      socket.on('client-count', (count) => {
        connectedDevices = count;
        render();
      });

      socket.on('disconnect', () => {
        console.log('Disconnected from server');
        showToast('Disconnected from server', 'error');
      });
    }

    // Toast notifications
    function showToast(message, type) {
      type = type || 'success';
      const id = Date.now();
      toasts.push({ id: id, message: message, type: type });
      render();
      setTimeout(function() {
        toasts = toasts.filter(function(t) { return t.id !== id; });
        render();
      }, 3000);
    }

    // File upload
    async function uploadFile(file) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('sharedBy', 'User');

      try {
        const res = await fetch(serverUrl + '/api/upload', {
          method: 'POST',
          body: formData
        });
        const item = await res.json();
        showToast('File uploaded: ' + file.name, 'success');
      } catch (err) {
        showToast('Upload failed', 'error');
      }
    }

    // Text share
    async function shareText() {
      if (!textInput.trim()) return;

      try {
        const res = await fetch(serverUrl + '/api/text', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: textInput, sharedBy: 'User' })
        });
        const item = await res.json();
        textInput = '';
        showToast('Text shared!', 'success');
        render();
      } catch (err) {
        showToast('Failed to share text', 'error');
      }
    }

    // Delete item
    async function deleteItem(id) {
      try {
        await fetch(serverUrl + '/api/items/' + id, { method: 'DELETE' });
        showToast('Item deleted', 'success');
      } catch (err) {
        showToast('Delete failed', 'error');
      }
    }

    // Copy text by ID - fixes special character issues
    function copyTextById(id) {
      const item = items.find(function(i) { return i.id === id; });
      if (item && item.content) {
        navigator.clipboard.writeText(item.content);
        showToast('Copied to clipboard!', 'success');
      }
    }

    // Download file
    function downloadFileById(id) {
      const item = items.find(function(i) { return i.id === id; });
      if (item && item.path) {
        const a = document.createElement('a');
        a.href = serverUrl + item.path;
        a.download = item.name;
        a.click();
        showToast('Downloading: ' + item.name, 'success');
      }
    }

    // Format size
    function formatSize(bytes) {
      if (!bytes) return '';
      if (bytes < 1024) return bytes + ' B';
      if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
      if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
      return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
    }

    // Format time
    function formatTime(timestamp) {
      const diff = Date.now() - timestamp;
      if (diff < 60000) return 'Just now';
      if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago';
      if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago';
      return new Date(timestamp).toLocaleDateString();
    }

    // Get file icon
    function getFileIcon(item) {
      if (item.type === 'text') return '📝';
      const mime = item.mimeType || '';
      if (mime.startsWith('image/')) return '🖼️';
      if (mime.startsWith('video/')) return '🎬';
      if (mime.startsWith('audio/')) return '🎵';
      if (mime.includes('pdf')) return '📕';
      if (mime.includes('zip') || mime.includes('rar')) return '📦';
      if (mime.includes('word') || mime.includes('document')) return '📄';
      if (mime.includes('sheet') || mime.includes('excel')) return '📊';
      return '📁';
    }

    // Escape HTML to prevent XSS
    function escapeHtml(text) {
      if (!text) return '';
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }

    // Filter items
    function getFilteredItems() {
      if (filter === 'all') return items;
      if (filter === 'files') return items.filter(function(i) { return i.type === 'file'; });
      if (filter === 'text') return items.filter(function(i) { return i.type === 'text'; });
      if (filter === 'media') return items.filter(function(i) {
        const mime = i.mimeType || '';
        return mime.startsWith('image/') || mime.startsWith('video/') || mime.startsWith('audio/');
      });
      return items;
    }

    // Render the app
    function render() {
      const filteredItems = getFilteredItems();
      
      let itemsHtml = '';
      if (filteredItems.length === 0) {
        itemsHtml = '<div class="glass rounded-2xl p-12 text-center"><div class="text-6xl mb-4">📭</div><h3 class="text-xl font-semibold mb-2">No items shared yet</h3><p class="text-gray-400">Upload a file or share some text to get started!</p></div>';
      } else {
        for (let i = 0; i < filteredItems.length; i++) {
          const item = filteredItems[i];
          const actionBtn = item.type === 'text' 
            ? '<button onclick="copyTextById(\\''+item.id+'\\')" class="p-2 rounded-lg bg-blue-600 hover:bg-blue-700 transition-colors" title="Copy">📋</button>'
            : '<button onclick="downloadFileById(\\''+item.id+'\\')" class="p-2 rounded-lg bg-green-600 hover:bg-green-700 transition-colors" title="Download">⬇️</button>';
          
          const contentInfo = item.type === 'text' 
            ? '<p class="text-gray-400 text-sm truncate">' + escapeHtml(item.content) + '</p>'
            : '<p class="text-gray-400 text-sm">' + formatSize(item.size) + '</p>';
          
          itemsHtml += '<div class="file-item glass rounded-xl p-4 flex items-center gap-4 hover:bg-white/10 transition-all group">' +
            '<div class="text-3xl">' + getFileIcon(item) + '</div>' +
            '<div class="flex-1 min-w-0">' +
              '<h4 class="font-medium truncate">' + escapeHtml(item.name) + '</h4>' +
              contentInfo +
              '<p class="text-gray-500 text-xs mt-1">' + formatTime(item.timestamp) + (item.sharedBy ? ' • ' + escapeHtml(item.sharedBy) : '') + '</p>' +
            '</div>' +
            '<div class="flex gap-2">' +
              actionBtn +
              '<button onclick="deleteItem(\\''+item.id+'\\')" class="p-2 rounded-lg bg-red-600 hover:bg-red-700 transition-colors" title="Delete">🗑️</button>' +
            '</div>' +
          '</div>';
        }
      }

      const filterBtns = ['all', 'files', 'text', 'media'].map(function(f) {
        const label = f === 'all' ? '📋 All' : f === 'files' ? '📁 Files' : f === 'text' ? '📝 Text' : '🎬 Media';
        const active = filter === f ? 'bg-purple-600' : 'glass hover:bg-white/10';
        return '<button onclick="filter=\\''+f+'\\'; render()" class="px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap '+active+'">'+label+'</button>';
      }).join('');

      let toastsHtml = '';
      for (let i = 0; i < toasts.length; i++) {
        const t = toasts[i];
        const borderColor = t.type === 'success' ? 'border-green-500' : 'border-red-500';
        const icon = t.type === 'success' ? '✅' : '❌';
        toastsHtml += '<div class="toast glass px-4 py-3 rounded-xl flex items-center gap-3 '+borderColor+' border"><span>'+icon+'</span><span>'+escapeHtml(t.message)+'</span></div>';
      }
      
      document.getElementById('app').innerHTML = 
        '<div class="max-w-4xl mx-auto p-4 sm:p-6">' +
          '<div class="text-center mb-8">' +
            '<div class="inline-flex items-center gap-3 mb-4">' +
              '<span class="text-5xl">🚀</span>' +
              '<h1 class="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 text-transparent bg-clip-text">GravityShare</h1>' +
            '</div>' +
            '<p class="text-gray-400 text-sm">Local Wi-Fi File Sharing</p>' +
            '<div class="mt-4 inline-flex items-center gap-2 glass px-4 py-2 rounded-full">' +
              '<span class="relative flex h-3 w-3"><span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span><span class="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span></span>' +
              '<span class="text-green-400 text-sm font-medium">' + connectedDevices + ' device' + (connectedDevices !== 1 ? 's' : '') + ' connected</span>' +
            '</div>' +
          '</div>' +
          '<div id="dropZone" class="drop-zone glass rounded-2xl p-8 mb-6 text-center cursor-pointer border-2 border-dashed border-gray-600 transition-all duration-300 hover:border-purple-500">' +
            '<div class="text-5xl mb-4">📤</div>' +
            '<h3 class="text-xl font-semibold mb-2">Drag & Drop Files Here</h3>' +
            '<p class="text-gray-400 text-sm mb-4">or click to browse</p>' +
            '<input type="file" id="fileInput" class="hidden" multiple>' +
            '<button onclick="document.getElementById(\\'fileInput\\').click()" class="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 px-6 py-3 rounded-xl font-medium transition-all">Select Files</button>' +
          '</div>' +
          '<div class="glass rounded-2xl p-6 mb-6">' +
            '<h3 class="text-lg font-semibold mb-4 flex items-center gap-2"><span>📝</span> Share Text</h3>' +
            '<div class="flex gap-3">' +
              '<input type="text" id="textInput" value="" placeholder="Type a message or paste text..." class="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-3 focus:outline-none focus:border-purple-500 transition-colors">' +
              '<button onclick="shareText()" class="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 px-6 py-3 rounded-xl font-medium transition-all whitespace-nowrap">Share</button>' +
            '</div>' +
          '</div>' +
          '<div class="flex gap-2 mb-6 overflow-x-auto pb-2">' +
            filterBtns +
            '<div class="ml-auto text-gray-400 text-sm self-center">' + filteredItems.length + ' items</div>' +
          '</div>' +
          '<div class="space-y-3">' + itemsHtml + '</div>' +
          '<div class="mt-8 text-center text-gray-500 text-sm">' +
            '<p>Server: ' + serverUrl + '</p>' +
            '<p class="mt-1">All files are shared locally on your network</p>' +
          '</div>' +
        '</div>' +
        '<div class="fixed bottom-4 right-4 space-y-2 z-50">' + toastsHtml + '</div>';

      setupEventListeners();
    }

    // Setup event listeners
    function setupEventListeners() {
      const dropZone = document.getElementById('dropZone');
      const fileInput = document.getElementById('fileInput');
      const textInputEl = document.getElementById('textInput');

      if (dropZone) {
        dropZone.ondragover = function(e) {
          e.preventDefault();
          dropZone.classList.add('dragover');
        };
        dropZone.ondragleave = function() {
          dropZone.classList.remove('dragover');
        };
        dropZone.ondrop = function(e) {
          e.preventDefault();
          dropZone.classList.remove('dragover');
          const files = e.dataTransfer.files;
          for (let i = 0; i < files.length; i++) {
            uploadFile(files[i]);
          }
        };
        dropZone.onclick = function(e) {
          if (e.target.tagName !== 'BUTTON') {
            fileInput && fileInput.click();
          }
        };
      }

      if (fileInput) {
        fileInput.onchange = function(e) {
          const files = e.target.files;
          for (let i = 0; i < files.length; i++) {
            uploadFile(files[i]);
          }
          e.target.value = '';
        };
      }

      if (textInputEl) {
        textInputEl.value = textInput;
        textInputEl.oninput = function(e) {
          textInput = e.target.value;
        };
        textInputEl.onkeypress = function(e) {
          if (e.key === 'Enter') {
            shareText();
          }
        };
      }
    }

    // Initialize
    initSocket();
    render();

    // Fetch items initially
    fetch(serverUrl + '/api/items')
      .then(function(res) { return res.json(); })
      .then(function(data) {
        items = data;
        render();
      })
      .catch(function(err) { console.error('Failed to fetch items:', err); });
  </script>
</body>
</html>
  `);
});

// API Routes
app.get('/api/ping', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// Server status endpoint (for frontend compatibility)
app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    localIP: req.headers.host || 'localhost:3001',
    connectedDevices: io.engine.clientsCount || 1,
    totalItems: sharedItems.length
  });
});

app.get('/api/items', (req, res) => {
  res.json(sharedItems);
});

app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const newItem = {
    id: Date.now().toString(),
    type: 'file',
    name: req.file.originalname,
    size: req.file.size,
    mimeType: req.file.mimetype,
    path: `/uploads/${req.file.filename}`,
    timestamp: Date.now(),
    sharedBy: req.body.sharedBy || 'Anonymous'
  };

  sharedItems.unshift(newItem);
  saveItems();
  io.emit('item-added', newItem);
  console.log(`📤 File uploaded: ${req.file.originalname}`);
  res.json(newItem);
});

app.post('/api/text', (req, res) => {
  const { content, sharedBy } = req.body;
  
  if (!content) {
    return res.status(400).json({ error: 'No content provided' });
  }

  const newItem = {
    id: Date.now().toString(),
    type: 'text',
    name: 'Text Snippet',
    content: content,
    size: Buffer.byteLength(content, 'utf8'),
    timestamp: Date.now(),
    sharedBy: sharedBy || 'Anonymous'
  };

  sharedItems.unshift(newItem);
  saveItems();
  io.emit('item-added', newItem);
  console.log(`📝 Text shared: ${content.substring(0, 50)}...`);
  res.json(newItem);
});

app.delete('/api/items/:id', (req, res) => {
  const { id } = req.params;
  const itemIndex = sharedItems.findIndex(item => item.id === id);
  
  if (itemIndex === -1) {
    return res.status(404).json({ error: 'Item not found' });
  }

  const item = sharedItems[itemIndex];
  
  if (item.type === 'file' && item.path) {
    const filePath = path.join(__dirname, item.path);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  sharedItems.splice(itemIndex, 1);
  saveItems();
  io.emit('item-deleted', id);
  console.log(`🗑️ Item deleted: ${item.name}`);
  res.json({ success: true });
});

// Socket.io
io.on('connection', (socket) => {
  console.log(`✅ Client connected: ${socket.id}`);
  socket.emit('initial-items', sharedItems);
  io.emit('client-count', io.engine.clientsCount);
  
  socket.on('disconnect', () => {
    console.log(`❌ Client disconnected: ${socket.id}`);
    io.emit('client-count', io.engine.clientsCount);
  });
});

// Start server
server.listen(PORT, '0.0.0.0', () => {
  const bestIP = getBestIP();
  
  console.log('\n');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('        🚀 GravityShare Server Running!');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');
  console.log('   📱 Open in browser:');
  console.log('');
  console.log(`   Local:    http://localhost:${PORT}`);
  console.log(`   Network:  http://${bestIP}:${PORT}`);
  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');
  console.log('   👆 Open the Network URL on your phone to share files!');
  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');
});

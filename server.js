const express = require('express');
const path = require('path');
const { execSync } = require('child_process');
const socketIo = require('socket.io');
const http = require('http');

const app = express();
const PORT = 3000;

// Liberar puerto al inicio (solo Linux)
function killPort() {
  try {
    execSync(`fuser -k ${PORT}/tcp 2>/dev/null`);
    console.log(`🔥 Puerto ${PORT} liberado`);
  } catch {
    console.log(`✅ Puerto ${PORT} estaba libre`);
  }
}

killPort(); // Ejecutar al inicio

// Configuración del servidor
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const server = http.createServer(app);
const io = socketIo(server); // Correcta inicialización de Socket.io

// Store chat history
const messageHistory = [];
const MAX_HISTORY = 100; // Keep last 100 messages

io.on('connection', (socket) => {
  console.log('New user connected');
  
  // Send chat history to new user
  socket.emit('history', messageHistory);
  
  // Broadcast when a user connects
  socket.on('new user', (username) => {
    socket.username = username;
    io.emit('user connected', username); // Usar io.emit para que todos lo vean
  });
  
  // Listen for chat messages
  socket.on('chat message', (data) => {
    const message = {
      username: data.username,
      message: data.message,
      timestamp: new Date()
    };
    
    // Add to history
    messageHistory.push(message);
    if (messageHistory.length > MAX_HISTORY) {
      messageHistory.shift(); // Remove oldest message
    }
    
    // Broadcast to all clients
    io.emit('chat message', message);
  });
  
  // Listen for typing events
  socket.on('typing', (username) => {
    socket.broadcast.emit('typing', username);
  });
  
  // Handle disconnection
  socket.on('disconnect', () => {
    if (socket.username) {
      io.emit('user disconnected', socket.username);
    }
    console.log('User disconnected');
  });
});

// Manejo de cierre elegante
let isClosing = false;

const gracefulShutdown = () => {
  if (isClosing) return;
  isClosing = true;

  console.log('\n🔌 Apagando servidor...');
  server.close(() => {
    console.log('✅ Servidor cerrado limpiamente');
    process.exit(0);
  });

  setTimeout(() => {
    console.log('⚠️ Cerrando forzosamente...');
    process.exit(1);
  }, 3000);
};

process.once('SIGINT', gracefulShutdown);
process.once('SIGTERM', gracefulShutdown);

server.listen(PORT, () => {
  console.log(`🚀 Servidor en http://localhost:${PORT}`);
});

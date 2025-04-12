const express = require("express");
const path = require("path");
const http = require("http");
const socketIo = require("socket.io");

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

// Configuración de Express
app.use(express.static(path.join(__dirname, "public")));

// Ruta principal
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Configuración de Socket.io
// Cambia la configuración de Socket.io al inicio del archivo
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  // Añade estas opciones para Render:
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000
});
// Almacenamiento de datos
const messageHistory = [];
const MAX_HISTORY = 100;
const onlineUsers = new Map();

io.on("connection", (socket) => {
  console.log("✅ Nuevo usuario conectado:", socket.id);

  // Enviar historial al nuevo usuario
  socket.emit("history", messageHistory);

  // Registrar nuevo usuario
  socket.on("new user", (username) => {
    socket.username = username;
    onlineUsers.set(socket.id, {
      username: username,
      status: "online",
      lastSeen: null,
    });

    io.emit("user connected", username);
    io.emit("online users", Array.from(onlineUsers.values()));
    console.log(`👋 ${username} se unió al chat`);
  });

  // Manejar mensajes
  socket.on("chat message", (data) => {
    const message = {
      username: data.username,
      message: data.message,
      timestamp: new Date().toISOString(),
    };

    // Actualizar historial
    messageHistory.push(message);
    if (messageHistory.length > MAX_HISTORY) messageHistory.shift();

    io.emit("new message", message);
  });

  // Manejar desconexión
  socket.on("disconnect", () => {
    if (socket.username) {
      const user = onlineUsers.get(socket.id);
      if (user) {
        user.status = "offline";
        user.lastSeen = new Date().toISOString();
      }

      io.emit("user disconnected", socket.username);
      io.emit("online users", Array.from(onlineUsers.values()));
      console.log(`🚪 ${socket.username} abandonó el chat`);
    }
    onlineUsers.delete(socket.id);
  });

  // Manejar estado "escribiendo"
  socket.on("typing", (username) => {
    socket.broadcast.emit("typing", username);
  });
});

// Verificar conexiones activas periódicamente
setInterval(() => {
  const now = new Date();
  onlineUsers.forEach((user, socketId) => {
    if (user.status === "online") {
      const socket = io.sockets.sockets.get(socketId);
      if (!socket) {
        user.status = "offline";
        user.lastSeen = now.toISOString();
      }
    }
  });
  io.emit("online users", Array.from(onlineUsers.values()));
}, 60000); // Cada minuto

// Iniciar servidor
server.listen(PORT, () => {
  console.log(`🚀 Servidor listo en puerto ${PORT}`);
});

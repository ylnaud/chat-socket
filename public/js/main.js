const socket = io();
const chatForm = document.getElementById("chat-form");
const usernameInput = document.getElementById("username");
const messageInput = document.getElementById("message");
const chatOutput = document.querySelector(".output");
const actions = document.querySelector(".actions");
const onlineUsersContainer = document.querySelector(".online-users");

let isUsernameSet = false;
let unreadMessages = 0;
let isWindowFocused = true;
const originalTitle = document.title;

// Verificar estado de la ventana
window.addEventListener("focus", () => {
  isWindowFocused = true;
  document.title = originalTitle;
  unreadMessages = 0;
});

window.addEventListener("blur", () => {
  isWindowFocused = false;
});

// Manejar envío del formulario
chatForm.addEventListener("submit", (e) => {
  e.preventDefault();

  if (!isUsernameSet) {
    setUsername();
    return;
  }

  sendMessage();
});

function setUsername() {
  const username = usernameInput.value.trim();
  if (username) {
    isUsernameSet = true;
    socket.emit("new user", username);
    usernameInput.readOnly = true;
    messageInput.focus();
    addSystemMessage(`Te has unido como ${username}`);
    checkNotificationPermission();
  }
}

function sendMessage() {
  const message = messageInput.value.trim();
  if (message) {
    const messageData = {
      username: usernameInput.value.trim(),
      message: message,
    };
    socket.emit("chat message", messageData);
    messageInput.value = "";
  }
}

// Detectar cuando el usuario está escribiendo
messageInput.addEventListener("input", () => {
  if (isUsernameSet) {
    socket.emit("typing", usernameInput.value.trim());
  }
});

// Notificaciones
function checkNotificationPermission() {
  if (!("Notification" in window)) {
    console.log("Este navegador no soporta notificaciones");
    return false;
  }

  if (Notification.permission === "granted") {
    return true;
  } else if (Notification.permission !== "denied") {
    Notification.requestPermission().then((permission) => {
      if (permission === "granted") {
        return true;
      }
    });
  }
  return false;
}

function playNotificationSound() {
  const audio = new Audio("/sounds/notification.mp3");
  audio.play().catch((e) => console.log("No se pudo reproducir sonido:", e));
}

function notifyUser(title, message) {
  // Actualizar título de la pestaña
  if (!isWindowFocused) {
    unreadMessages++;
    document.title = `(${unreadMessages}) ${originalTitle}`;
  }

  // Mostrar notificación
  if (!isWindowFocused && Notification.permission === "granted") {
    const notification = new Notification(title, {
      body: message,
      icon: "/favicon.ico",
      vibrate: [200, 100, 200],
    });

    notification.onclick = () => {
      window.focus();
    };
  }

  // Reproducir sonido
  playNotificationSound();
}

// Lista de usuarios online
function updateOnlineUsersList(users) {
  const onlineCount = users.filter((u) => u.status === "online").length;

  onlineUsersContainer.innerHTML = `
    <h3>Usuarios en línea (${onlineCount})</h3>
    <ul>
      ${users
        .map(
          (user) => `
        <li class="user-item ${user.status}">
          <span class="user-status-indicator ${user.status}"></span>
          <span class="username">${user.username}</span>
          ${
            user.status === "offline"
              ? `<span class="last-seen">Últ. vez ${formatLastSeen(user.lastSeen)}</span>`
              : `<span class="typing-indicator"></span>`
          }
        </li>
      `,
        )
        .join("")}
    </ul>
  `;
}

function formatLastSeen(timestamp) {
  if (!timestamp) return "recientemente";
  const now = new Date();
  const lastSeen = new Date(timestamp);
  const diffMinutes = Math.floor((now - lastSeen) / (1000 * 60));

  if (diffMinutes < 1) return "ahora mismo";
  if (diffMinutes < 60) return `hace ${diffMinutes} min`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `hace ${diffHours} h`;

  const diffDays = Math.floor(diffHours / 24);
  return `hace ${diffDays} d`;
}

// Escuchar eventos del servidor
socket.on("history", (history) => {
  history.forEach((msg) => addMessage(msg));
});

socket.on("new message", (msg) => {
  actions.innerHTML = "";
  addMessage(msg);

  if (msg.username !== usernameInput.value.trim()) {
    notifyUser(`Nuevo mensaje de ${msg.username}`, msg.message);
  }
});

socket.on("user connected", (username) => {
  addSystemMessage(`${username} se unió al chat`);
  if (username !== usernameInput.value.trim()) {
    notifyUser("Usuario conectado", `${username} se unió al chat`);
  }
});

socket.on("user disconnected", (username) => {
  addSystemMessage(`${username} abandonó el chat`);
});

socket.on("typing", (username) => {
  actions.innerHTML = `<p><em>${username} está escribiendo...</em></p>`;

  // Mostrar indicador "escribiendo" en la lista de usuarios
  const userItems = onlineUsersContainer.querySelectorAll(".user-item");
  userItems.forEach((item) => {
    if (item.querySelector(".username").textContent === username) {
      const typingIndicator = item.querySelector(".typing-indicator");
      typingIndicator.textContent = "escribiendo...";
      setTimeout(() => {
        typingIndicator.textContent = "";
      }, 3000);
    }
  });
});

socket.on("online users", (users) => {
  updateOnlineUsersList(users);
});

// Funciones auxiliares
function addMessage(msg) {
  const div = document.createElement("div");
  div.classList.add("message");
  div.innerHTML = `
    <strong>${msg.username}</strong>
    <span>${msg.message}</span>
    <small>${new Date(msg.timestamp).toLocaleTimeString()}</small>
  `;
  chatOutput.appendChild(div);
  chatOutput.scrollTop = chatOutput.scrollHeight;
}

function addSystemMessage(text) {
  const div = document.createElement("div");
  div.classList.add("system-message");
  div.textContent = text;
  chatOutput.appendChild(div);
  chatOutput.scrollTop = chatOutput.scrollHeight;
}

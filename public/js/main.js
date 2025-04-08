// main.js - Socket.io Chat Application

// DOM Elements
const chatForm = document.getElementById('chat-form');
const messageInput = document.getElementById('message');
const usernameInput = document.getElementById('username');
const chatWindow = document.querySelector('.chat-window .output');
const actions = document.querySelector('.actions');

// Connect to Socket.io server
const socket = io();

// Utility functions
const displayMessage = (message) => {
  const messageElement = document.createElement('p');
  messageElement.textContent = message;
  chatWindow.appendChild(messageElement);
  chatWindow.scrollTop = chatWindow.scrollHeight; // Auto-scroll to bottom
};

const displayTyping = (username) => {
  actions.textContent = `${username} is typing...`;
  setTimeout(() => {
    actions.textContent = '';
  }, 3000);
};

// Event listeners
chatForm.addEventListener('submit', (e) => {
  e.preventDefault();
  
  const username = usernameInput.value.trim();
  const message = messageInput.value.trim();
  
  if (username && message) {
    // Emit message to server
    socket.emit('chat message', { username, message });
    
    // Clear message input but keep username
    messageInput.value = '';
    messageInput.focus();
  }
});

messageInput.addEventListener('input', () => {
  const username = usernameInput.value.trim();
  if (username) {
    socket.emit('typing', username);
  }
});

// Socket.io event handlers
socket.on('connect', () => {
  displayMessage('Connected to chat server');
});

socket.on('disconnect', () => {
  displayMessage('Disconnected from chat server');
});

socket.on('chat message', (data) => {
  displayMessage(`${data.username}: ${data.message}`);
});

socket.on('typing', (username) => {
  displayTyping(username);
});

socket.on('user connected', (username) => {
  displayMessage(`${username} joined the chat`);
});

socket.on('user disconnected', (username) => {
  displayMessage(`${username} left the chat`);
});

socket.on('history', (messages) => {
  messages.forEach(msg => {
    displayMessage(`${msg.username}: ${msg.message}`);
  });
});

// Initial focus on username input
usernameInput.focus();

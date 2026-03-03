const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const rooms = {};

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join-room', ({ roomCode, name }) => {
        socket.join(roomCode);
        console.log(`${name} (${socket.id}) joined room: ${roomCode}`);

        if (!rooms[roomCode]) {
            rooms[roomCode] = [];
        }
        rooms[roomCode].push({ id: socket.id, name });

        // Notify others in the room
        socket.to(roomCode).emit('user-joined', { id: socket.id, name });

        // Send existing users to the new user
        const otherUsers = rooms[roomCode].filter(u => u.id !== socket.id);
        socket.emit('all-users', otherUsers);
    });

    socket.on('offer', ({ to, offer }) => {
        console.log(`[SIGNAL] Offer from ${socket.id} to ${to}`);
        io.to(to).emit('offer', { from: socket.id, offer });
    });

    socket.on('answer', ({ to, answer }) => {
        console.log(`[SIGNAL] Answer from ${socket.id} to ${to}`);
        io.to(to).emit('answer', { from: socket.id, answer });
    });

    socket.on('ice-candidate', ({ to, candidate }) => {
        console.log(`[SIGNAL] ICE Candidate from ${socket.id} to ${to}`);
        io.to(to).emit('ice-candidate', { from: socket.id, candidate });
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        for (const roomCode in rooms) {
            rooms[roomCode] = rooms[roomCode].filter(u => u.id !== socket.id);
            if (rooms[roomCode].length === 0) {
                delete rooms[roomCode];
            } else {
                io.to(roomCode).emit('user-left', socket.id);
            }
        }
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
});

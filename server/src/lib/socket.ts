import { Server as HttpServer } from "http";
import { Server } from "socket.io";

let io: Server;

export function initSocket(httpServer: HttpServer, clientUrl: string) {
  io = new Server(httpServer, {
    cors: {
      origin: clientUrl,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    },
  });

  io.on("connection", (socket) => {
    console.log(`Client connected: ${socket.id}`);

    socket.on("join-board", (boardId: string) => {
      socket.join(`board:${boardId}`);
    });

    socket.on("leave-board", (boardId: string) => {
      socket.leave(`board:${boardId}`);
    });

    socket.on("disconnect", () => {
      console.log(`Client disconnected: ${socket.id}`);
    });
  });

  return io;
}

export function getIO(): Server | null {
  return io || null;
}

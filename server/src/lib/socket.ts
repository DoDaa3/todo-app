import { Server as HttpServer } from "http";
import { Server } from "socket.io";

let io: Server;

// Track online users per workspace
const onlineUsers = new Map<string, Set<string>>();

export function initSocket(httpServer: HttpServer, clientUrl: string) {
  io = new Server(httpServer, {
    cors: {
      origin: clientUrl.split(",").map((u) => u.trim()),
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    },
  });

  // Try to use Redis adapter if REDIS_URL is set
  if (process.env.REDIS_URL) {
    import("ioredis").then(({ default: Redis }) => {
      import("@socket.io/redis-adapter").then(({ createAdapter }) => {
        const pubClient = new Redis(process.env.REDIS_URL!);
        const subClient = pubClient.duplicate();
        io.adapter(createAdapter(pubClient, subClient));
        console.log("[Socket.io] Redis adapter connected");
      });
    }).catch((err) => {
      console.warn("[Socket.io] Redis adapter not available:", err.message);
    });
  }

  io.on("connection", (socket) => {
    console.log(`Client connected: ${socket.id}`);

    // Join a user-specific room for notifications & board membership updates
    socket.on("join-user", (userId: string) => {
      socket.join(`user:${userId}`);
      socket.data.userId = userId;
    });

    socket.on("join-board", (boardId: string) => {
      socket.join(`board:${boardId}`);
    });

    socket.on("leave-board", (boardId: string) => {
      socket.leave(`board:${boardId}`);
    });

    // Workspace presence
    socket.on("join-workspace", (data: { workspaceId: string; userId: string }) => {
      const { workspaceId, userId } = data;
      socket.join(`workspace:${workspaceId}`);
      socket.data.workspaceId = workspaceId;
      socket.data.userId = userId;

      if (!onlineUsers.has(workspaceId)) {
        onlineUsers.set(workspaceId, new Set());
      }
      onlineUsers.get(workspaceId)!.add(userId);

      io.to(`workspace:${workspaceId}`).emit("workspace:presence", {
        onlineUserIds: Array.from(onlineUsers.get(workspaceId)!),
      });
    });

    socket.on("leave-workspace", (workspaceId: string) => {
      socket.leave(`workspace:${workspaceId}`);
      if (socket.data.userId && onlineUsers.has(workspaceId)) {
        onlineUsers.get(workspaceId)!.delete(socket.data.userId);
        io.to(`workspace:${workspaceId}`).emit("workspace:presence", {
          onlineUserIds: Array.from(onlineUsers.get(workspaceId)!),
        });
      }
    });

    socket.on("disconnect", () => {
      const { workspaceId, userId } = socket.data;
      if (workspaceId && userId && onlineUsers.has(workspaceId)) {
        onlineUsers.get(workspaceId)!.delete(userId);
        io.to(`workspace:${workspaceId}`).emit("workspace:presence", {
          onlineUserIds: Array.from(onlineUsers.get(workspaceId)!),
        });
      }
      console.log(`Client disconnected: ${socket.id}`);
    });
  });

  return io;
}

export function getIO(): Server | null {
  return io || null;
}

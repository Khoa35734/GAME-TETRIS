// Shared auth user shape attached to Express requests and Socket.IO handshake.

export interface AuthUser {
  accountId: number;
  username: string;
  role: string;
  tokenId: string;
}

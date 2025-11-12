import express, { Request, Response } from 'express';
import Friendship, { FriendshipStatus } from '../models/Friendship';
import User from '../models/User';
import jwt from 'jsonwebtoken';
import { Op } from 'sequelize';
import { isUserOnline, getUserPresence } from '../index';
import { onlineUsers } from '../core/state';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || '123456';

// Middleware to verify JWT token
interface AuthRequest extends Request {
  userId?: number;
}

const extractToken = (req: AuthRequest): string | null => {
  const normalize = (value: string | null | undefined): string | null => {
    if (!value) return null;
    const trimmed = value.trim();
    if (!trimmed || trimmed === 'undefined' || trimmed === 'null') return null;
    return trimmed;
  };

  const authHeader = req.headers['authorization'];
  if (typeof authHeader === 'string') {
    if (authHeader.startsWith('Bearer ')) {
      const bearerToken = normalize(authHeader.slice(7));
      if (bearerToken) return bearerToken;
    }

    const rawHeaderToken = normalize(authHeader);
    if (rawHeaderToken) return rawHeaderToken;
  }

  const cookieHeader = req.headers['cookie'];
  if (typeof cookieHeader === 'string') {
    const possibleKeys = ['token', 'accessToken', 'authToken', 'authorization'];
    const cookies = cookieHeader.split(';').map((pair) => pair.trim());

    for (const key of possibleKeys) {
      const match = cookies.find((pair) => pair.toLowerCase().startsWith(`${key.toLowerCase()}=`));
      if (match) {
        const [, rawToken] = match.split('=');
        const normalized = normalize(rawToken ? decodeURIComponent(rawToken) : null);
        if (normalized) return normalized;
      }
    }
  }

  return null;
};

const authenticateToken = (req: AuthRequest, res: Response, next: Function) => {
  const token = extractToken(req);

  if (!token) {
    console.warn('[Friends Auth] ❌ No token provided');
    return res.status(401).json({ success: false, message: 'Token không được cung cấp' });
  }

  jwt.verify(token, JWT_SECRET, (err: any, decoded: any) => {
    if (err) {
      console.error('[Friends Auth] ❌ JWT verification failed:', err.message);
      return res.status(403).json({ success: false, message: 'Token không hợp lệ' });
    }

    if (!decoded) {
      console.error('[Friends Auth] ❌ Empty decoded payload');
      return res.status(403).json({ success: false, message: 'Token không hợp lệ' });
    }

    const possibleId =
      decoded.accountId ?? decoded.user_id ?? decoded.userId ?? decoded.id ?? decoded.account_id;

    const normalizedId = Number(possibleId);

    if (!Number.isFinite(normalizedId) || normalizedId <= 0) {
      console.error('[Friends Auth] ❌ Invalid user ID in token:', decoded);
      return res.status(403).json({ success: false, message: 'Token không hợp lệ' });
    }

    console.log('[Friends Auth] ✅ Authenticated user:', normalizedId);
    req.userId = normalizedId;
    next();
  });
};

// GET /api/friends - Lấy danh sách bạn bè
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;

    // Lấy tất cả friendships của user (cả 2 chiều)
    const friendships = await Friendship.findAll({
      where: {
        [Op.or]: [
          { user_id: userId, status: FriendshipStatus.ACCEPTED },
          { friend_id: userId, status: FriendshipStatus.ACCEPTED },
        ],
      },
    });

    console.log('[Friends] Fetch friends for', userId, {
      totalFriendships: friendships.length,
      onlineUsersKeys: Array.from(onlineUsers.keys()),
    });    const friendIds = Array.from(
      new Set(
        friendships
          .map((f) => {
            const rawId = f.user_id === userId ? f.friend_id : f.user_id;
            const coercedId = Number(rawId);
            return Number.isFinite(coercedId) ? coercedId : null;
          })
          .filter((id): id is number => id !== null && id !== userId)
      )
    );

    if (friendIds.length === 0) {
      return res.json({ success: true, friends: [] });
    }

    // Lấy thông tin user của friends
    const friends = await User.findAll({
      where: { user_id: { [Op.in]: friendIds } },
      attributes: ['user_id', 'user_name', 'email', 'created_at'],
    });

    res.json({
      success: true,
      friends: friends.map((f) => {
        const friendId = Number(f.user_id);
        const presence = getUserPresence(friendId);
        const isOnline = isUserOnline(friendId);
        console.log('[Friends] Friend', friendId, 'online?', isOnline, 'presence:', presence);
        return {
          userId: friendId,
          username: f.user_name,
          email: f.email,
          createdAt: f.created_at,
          isOnline,
          presenceStatus: presence?.status || (isOnline ? 'online' : 'offline'),
          gameMode: presence?.mode,
          inGameSince: presence?.since,
        };
      }),
    });
  } catch (error: any) {
    console.error('[Friends] Get friends error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
});

// GET /api/friends/requests - Lấy danh sách lời mời kết bạn
router.get('/requests', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;

    // Lấy các lời mời đến (user khác gửi cho mình)
    const incomingRequests = await Friendship.findAll({
      where: {
        friend_id: userId,
        status: FriendshipStatus.REQUESTED,
      },
      include: [
        {
          model: User,
          as: 'requester',
          attributes: ['user_id', 'user_name', 'email'],
        },
      ],
    });

    // Lấy các lời mời đi (mình gửi cho user khác)
    const outgoingRequests = await Friendship.findAll({
      where: {
        user_id: userId,
        status: FriendshipStatus.REQUESTED,
      },
      include: [
        {
          model: User,
          as: 'friend',
          attributes: ['user_id', 'user_name', 'email'],
        },
      ],
    });

    res.json({
      success: true,
      incoming: incomingRequests.map((req: any) => ({
        userId: req.requester.user_id,
        username: req.requester.user_name,
        email: req.requester.email,
        requestedAt: req.requested_at,
      })),
      outgoing: outgoingRequests.map((req: any) => ({
        userId: req.friend.user_id,
        username: req.friend.user_name,
        email: req.friend.email,
        requestedAt: req.requested_at,
      })),
    });
  } catch (error: any) {
    console.error('[Friends] Get requests error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
});

// POST /api/friends/search - Tìm user theo user_id
router.post('/search', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { userId: searchUserId } = req.body;
    const currentUserId = req.userId!;

    if (!searchUserId) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập User ID' });
    }

    // Không thể tìm chính mình
    if (Number(searchUserId) === currentUserId) {
      return res.status(400).json({ success: false, message: 'Không thể tìm chính mình' });
    }

    // Tìm user
    const user = await User.findOne({
      where: { user_id: searchUserId },
      attributes: ['user_id', 'user_name', 'email', 'created_at'],
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy user' });
    }

    // Kiểm tra trạng thái friendship
    const friendship = await Friendship.findOne({
      where: {
        [Op.or]: [
          { user_id: currentUserId, friend_id: searchUserId },
          { user_id: searchUserId, friend_id: currentUserId },
        ],
      },
    });

    let relationshipStatus: 'none' | 'requested' | 'accepted' | 'blocked' = 'none';
    let isOutgoing = false;

    if (friendship) {
      relationshipStatus = friendship.status as any;
      isOutgoing = friendship.user_id === currentUserId;
    }

    res.json({
      success: true,
      user: {
        userId: user.user_id,
        username: user.user_name,
        email: user.email,
        createdAt: user.created_at,
        relationshipStatus,
        isOutgoing,
      },
    });
  } catch (error: any) {
    console.error('[Friends] Search error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
});

// POST /api/friends/request - Gửi lời mời kết bạn
router.post('/request', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { friendId } = req.body;
    const userId = req.userId!;

    if (!friendId) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp friend ID' });
    }

    if (Number(friendId) === userId) {
      return res.status(400).json({ success: false, message: 'Không thể kết bạn với chính mình' });
    }

    // Kiểm tra user tồn tại
    const friendUser = await User.findOne({ where: { user_id: friendId } });
    if (!friendUser) {
      return res.status(404).json({ success: false, message: 'User không tồn tại' });
    }

    // Kiểm tra đã có friendship chưa
    const existingFriendship = await Friendship.findOne({
      where: {
        [Op.or]: [
          { user_id: userId, friend_id: friendId },
          { user_id: friendId, friend_id: userId },
        ],
      },
    });

    if (existingFriendship) {
      if (existingFriendship.status === FriendshipStatus.ACCEPTED) {
        return res.status(400).json({ success: false, message: 'Đã là bạn bè' });
      }
      if (existingFriendship.status === FriendshipStatus.REQUESTED) {
        return res.status(400).json({ success: false, message: 'Lời mời đã được gửi' });
      }
      if (existingFriendship.status === FriendshipStatus.BLOCKED) {
        return res.status(400).json({ success: false, message: 'Không thể gửi lời mời' });
      }
    }

    // Tạo friendship mới
    await Friendship.create({
      user_id: userId,
      friend_id: friendId,
      status: FriendshipStatus.REQUESTED,
      requested_at: new Date(),
    });

    res.json({ success: true, message: 'Đã gửi lời mời kết bạn' });
  } catch (error: any) {
    console.error('[Friends] Request error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
});

// POST /api/friends/accept - Chấp nhận lời mời kết bạn
router.post('/accept', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { friendId } = req.body;
    const userId = req.userId!;

    const friendship = await Friendship.findOne({
      where: {
        user_id: friendId,
        friend_id: userId,
        status: FriendshipStatus.REQUESTED,
      },
    });

    if (!friendship) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy lời mời' });
    }

    friendship.status = FriendshipStatus.ACCEPTED;
    friendship.accepted_at = new Date();
    await friendship.save();

    res.json({ success: true, message: 'Đã chấp nhận lời mời kết bạn' });
  } catch (error: any) {
    console.error('[Friends] Accept error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
});

// POST /api/friends/reject - Từ chối lời mời kết bạn
router.post('/reject', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { friendId } = req.body;
    const userId = req.userId!;

    const result = await Friendship.destroy({
      where: {
        user_id: friendId,
        friend_id: userId,
        status: FriendshipStatus.REQUESTED,
      },
    });

    if (result === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy lời mời' });
    }

    res.json({ success: true, message: 'Đã từ chối lời mời kết bạn' });
  } catch (error: any) {
    console.error('[Friends] Reject error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
});

// DELETE /api/friends/:friendId - Xóa bạn bè
router.delete('/:friendId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const friendId = Number(req.params.friendId);
    const userId = req.userId!;

    const result = await Friendship.destroy({
      where: {
        [Op.or]: [
          { user_id: userId, friend_id: friendId },
          { user_id: friendId, friend_id: userId },
        ],
        status: FriendshipStatus.ACCEPTED,
      },
    });

    if (result === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy bạn bè' });
    }

    res.json({ success: true, message: 'Đã xóa bạn bè' });
  } catch (error: any) {
    console.error('[Friends] Delete error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
});

export default router;

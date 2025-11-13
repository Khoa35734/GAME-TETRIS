import express, { Request, Response } from 'express';
import Friendship, { FriendshipStatus } from '../models/Friendship';
import User from '../models/User';
import jwt from 'jsonwebtoken';
import { Op } from 'sequelize';
import { isUserOnline, getUserPresence } from '../core/presence';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || '123456';

// Middleware to verify JWT token
interface AuthRequest extends Request {
  userId?: number;
}

const authenticateToken = (req: AuthRequest, res: Response, next: Function) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Token không được cung cấp' });
  }

  jwt.verify(token, JWT_SECRET, (err: any, decoded: any) => {
    if (err) {
      return res.status(403).json({ success: false, message: 'Token không hợp lệ' });
    }
    req.userId = decoded.accountId || decoded.user_id;
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

    // Lấy danh sách friend IDs
    const friendIds = friendships.map((f) =>
      f.user_id === userId ? f.friend_id : f.user_id
    );

    // Lấy thông tin user của friends
    const friends = await User.findAll({
      where: { user_id: { [Op.in]: friendIds } },
      attributes: ['user_id', 'user_name', 'email', 'created_at'],
    });

    res.json({
      success: true,
      friends: friends.map((f) => {
        const presence = getUserPresence(f.user_id);
        const currentStatus = presence?.status || 'offline';
        const isCurrentlyOnline = currentStatus !== 'offline';
        return {
          userId: f.user_id,
          username: f.user_name,
          email: f.email,
          createdAt: f.created_at,
          isOnline: isCurrentlyOnline,
          presenceStatus: currentStatus, 
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
// server/src/services/friendService.ts
import { Op } from 'sequelize';
import Friendship, { FriendshipStatus } from '../models/Friendship';

export async function getFriendIds(userId: number): Promise<number[]> {
  const friendships = await Friendship.findAll({
    where: {
      [Op.or]: [
        { user_id: userId, status: FriendshipStatus.ACCEPTED },
        { friend_id: userId, status: FriendshipStatus.ACCEPTED },
      ],
    },
    attributes: ['user_id', 'friend_id'], // Chỉ cần lấy ID
  });

  // Trích xuất ID bạn bè
  const friendIds = friendships.map((f) =>
    f.user_id === userId ? f.friend_id : f.user_id
  );

  return friendIds;
}
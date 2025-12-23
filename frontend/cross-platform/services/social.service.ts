import { ApiService as api } from './api.service';

export const socialService = {
  async followUser(userId: string, token: string) {
    return api.post(`/api/social/graph/follow/${userId}`, {}, token);
  },

  async unfollowUser(userId: string, token: string) {
    return api.delete(`/api/social/graph/unfollow/${userId}`, token);
  },
};

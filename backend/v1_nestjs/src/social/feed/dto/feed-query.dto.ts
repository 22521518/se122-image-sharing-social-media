import { IsOptional, IsInt, Min, Max, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class FeedQueryDto {
  @IsOptional()
  @IsString()
  cursor?: string; // Format: "createdAt_postId" for stable ordering

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  @Type(() => Number)
  limit?: number = 20;
}

export interface FeedPostResult {
  id: string;
  content: string;
  privacy: string;
  createdAt: Date;
  updatedAt: Date;
  likeCount: number;
  commentCount: number;
  author: {
    id: string;
    name: string | null;
    avatarUrl: string | null;
  };
  liked: boolean;
  media?: Array<{
    id: string;
    url: string;
    type: string;
    caption: string | null;
    sortOrder: number | null;
  }>;
}

export interface FeedResponse {
  posts: FeedPostResult[];
  nextCursor: string | null;
  hasMore: boolean;
}

import { IsOptional, IsString, MinLength, IsIn, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class SearchQueryDto {
  @IsString()
  @MinLength(2)
  q: string;

  @IsOptional()
  @IsIn(['all', 'users', 'posts', 'hashtags'])
  type?: 'all' | 'users' | 'posts' | 'hashtags' = 'all';

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  @Type(() => Number)
  limit?: number = 20;
}

export interface UserResult {
  id: string;
  name: string | null;
  avatarUrl: string | null;
  bio: string | null;
}

export interface PostResult {
  id: string;
  content: string;
  createdAt: Date;
  likeCount: number;
  author: {
    id: string;
    name: string | null;
    avatarUrl: string | null;
  };
}

export interface HashtagResult {
  id: string;
  tag: string;
  postCount: number;
}

export interface SearchResponse {
  users: UserResult[];
  posts: PostResult[];
  hashtags: HashtagResult[];
}

export interface TrendingResponse {
  posts: PostResult[];
}

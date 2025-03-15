import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Post, PostDocument } from './schemas/post.schema';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { GetPostFromUserResponseDto } from './dto/get-post-from-user.response.dto';
import { UsersService } from '../users/users.service';

@Injectable()
export class PostsService {
  constructor(
    @InjectModel(Post.name) private postModel: Model<PostDocument>,
    private usersService: UsersService,
  ) {}

  async create(createPostDto: CreatePostDto, userId: string): Promise<Post> {
    try {
      // Check if user exists
      await this.usersService.findOne(userId);

      // Create post
      const createdPost = new this.postModel({
        ...createPostDto,
        userId: new Types.ObjectId(userId),
      });

      return await createdPost.save();
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new BadRequestException('User not found');
      }
      throw error;
    }
  }

  async findAll(): Promise<GetPostFromUserResponseDto[]> {
    const posts = await this.postModel.aggregate([
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'userInfo',
        },
      },
      {
        $unwind: '$userInfo',
      },
      {
        $addFields: {
          user: {
            _id: '$userInfo._id',
            username: '$userInfo.username',
            email: '$userInfo.email',
          },
        },
      },
      {
        $project: {
          _id: 1,
          title: 1,
          content: 1,
          createdAt: 1,
          updatedAt: 1,
          user: 1,
        },
      },
      {
        $sort: { createdAt: -1 },
      },
    ]);

    return posts as GetPostFromUserResponseDto[];
  }

  async findOne(id: string): Promise<GetPostFromUserResponseDto> {
    try {
      const posts = await this.postModel.aggregate([
        {
          $match: {
            _id: new Types.ObjectId(id),
          },
        },
        {
          $lookup: {
            from: 'users',
            localField: 'userId',
            foreignField: '_id',
            as: 'userInfo',
          },
        },
        {
          $unwind: '$userInfo',
        },
        {
          $addFields: {
            user: {
              _id: '$userInfo._id',
              username: '$userInfo.username',
              email: '$userInfo.email',
            },
          },
        },
        {
          $project: {
            _id: 1,
            title: 1,
            content: 1,
            createdAt: 1,
            updatedAt: 1,
            user: 1,
          },
        },
      ]);

      if (!posts.length) {
        throw new NotFoundException('Post not found');
      }

      return posts[0] as GetPostFromUserResponseDto;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Invalid post ID');
    }
  }

  async update(id: string, updatePostDto: UpdatePostDto, userId: string): Promise<GetPostFromUserResponseDto> {
    try {
      // First find the post
      const post = await this.postModel.findById(id);
      if (!post) {
        throw new NotFoundException('Post not found');
      }

      // Check if user is the owner
      if (post.userId.toString() !== userId) {
        throw new ForbiddenException('You can only update your own posts');
      }

      // Update post fields
      Object.assign(post, updatePostDto);
      
      // Save updated post
      await post.save();

      // Return updated post with user info
      return this.findOne(id);
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }
      throw new BadRequestException('Error updating post');
    }
  }

  async remove(id: string, userId: string): Promise<void> {
    try {
      // First find the post
      const post = await this.postModel.findById(id);
      if (!post) {
        throw new NotFoundException('Post not found');
      }

      // Check if user is the owner
      if (post.userId.toString() !== userId) {
        throw new ForbiddenException('You can only delete your own posts');
      }

      // Delete the post
      await post.deleteOne();
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }
      throw new BadRequestException('Error deleting post');
    }
  }
} 
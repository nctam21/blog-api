import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User, UserDocument } from './schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

// Define a type for user response without password
type UserResponse = Omit<User, 'password'>;

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<UserResponse> {
    try {
      // Check if username exists
      const existingUsername = await this.userModel.findOne({
        username: createUserDto.username,
      });
      if (existingUsername) {
        throw new ConflictException('Username already exists');
      }

      // Check if email exists
      const existingEmail = await this.userModel.findOne({
        email: createUserDto.email,
      });
      if (existingEmail) {
        throw new ConflictException('Email already exists');
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

      // Create new user
      const createdUser = new this.userModel({
        ...createUserDto,
        password: hashedPassword,
      });

      // Save user
      const savedUser = await createdUser.save();
      
      // Return user without password
      const { password, ...result } = savedUser.toObject();
      return result as UserResponse;
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      throw new InternalServerErrorException('Error creating user');
    }
  }

  async findAll(): Promise<UserResponse[]> {
    const users = await this.userModel.find().select('-password').exec();
    return users.map(user => user.toObject()) as UserResponse[];
  }

  async findOne(id: string): Promise<UserResponse> {
    try {
      const user = await this.userModel.findById(id).select('-password').exec();
      if (!user) {
        throw new NotFoundException('User not found');
      }
      return user.toObject() as UserResponse;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Invalid user ID');
    }
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.userModel.findOne({ username }).exec();
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userModel.findOne({ email }).exec();
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<UserResponse> {
    try {
      // First find the user
      const user = await this.userModel.findById(id);
      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Check if updating username and it already exists
      if (updateUserDto.username && updateUserDto.username !== user.username) {
        const existingUsername = await this.userModel.findOne({
          username: updateUserDto.username,
          _id: { $ne: id },
        });
        if (existingUsername) {
          throw new ConflictException('Username already exists');
        }
      }

      // Check if updating email and it already exists
      if (updateUserDto.email && updateUserDto.email !== user.email) {
        const existingEmail = await this.userModel.findOne({
          email: updateUserDto.email,
          _id: { $ne: id },
        });
        if (existingEmail) {
          throw new ConflictException('Email already exists');
        }
      }

      // Hash password if it's being updated
      if (updateUserDto.password) {
        updateUserDto.password = await bcrypt.hash(updateUserDto.password, 10);
      }

      // Update user fields
      Object.assign(user, updateUserDto);
      
      // Save updated user
      const updatedUser = await user.save();
      
      // Return user without password
      const { password, ...result } = updatedUser.toObject();
      return result as UserResponse;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ConflictException) {
        throw error;
      }
      throw new BadRequestException('Error updating user');
    }
  }

  async remove(id: string): Promise<void> {
    try {
      // First find the user
      const user = await this.userModel.findById(id);
      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Then delete the user
      await user.deleteOne();
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Error deleting user');
    }
  }
} 
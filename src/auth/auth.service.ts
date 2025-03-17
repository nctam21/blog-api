import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateUser(username: string, password: string): Promise<any> {
    this.logger.debug(`Attempting to validate user: ${username}`);
    const user = await this.usersService.findByUsername(username);
    if (!user) {
      this.logger.debug(`User not found: ${username}`);
      throw new UnauthorizedException('Username not found');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      this.logger.debug(`Invalid password for user: ${username}`);
      throw new UnauthorizedException('Invalid password');
    }

    this.logger.debug(`User validated successfully: ${username}`);
    const { password: _, ...result } = (user as any).toObject();
    return result;
  }

  async login(username: string, password: string) {
    try {
      this.logger.debug(`Login attempt for user: ${username}`);
      const user = await this.validateUser(username, password);
      const payload = { username: user.username, sub: user._id };
      const accessToken = this.jwtService.sign(payload, { expiresIn: '1h' });
      const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });
      this.logger.debug(`Login successful for user: ${username}`);
      return {
        access_token: accessToken,
        refresh_token: refreshToken,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
        },
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error(`Login failed for user ${username}:`, error);
      throw new UnauthorizedException('Login failed');
    }
  }
} 
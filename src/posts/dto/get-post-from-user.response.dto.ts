export class UserInPostDto {
  _id: string;
  username: string;
  email: string;
}

export class GetPostFromUserResponseDto {
  _id: string;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  user: UserInPostDto;
} 
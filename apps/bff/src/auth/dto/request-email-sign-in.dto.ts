import { IsEmail } from 'class-validator';

export class RequestEmailSignInDto {
  @IsEmail()
  email!: string;
}

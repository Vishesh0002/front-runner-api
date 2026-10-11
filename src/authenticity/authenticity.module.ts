import { Module } from '@nestjs/common';
import { AuthenticityController } from './authenticity.controller';
import { AuthenticityService } from './authenticity.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AuthenticityController],
  providers: [AuthenticityService],
  exports: [AuthenticityService],
})
export class AuthenticityModule {}

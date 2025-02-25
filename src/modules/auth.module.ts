import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import * as dotenv from 'dotenv';
import { AuthService } from '../service/auth.service';
import { AdmUsrService } from '../service/admusr.service';
import { AuthContoller } from 'src/controllers/auth.controller';
import { AdmUsrModule } from './admusr.module';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { TokenModule } from './token.module';

dotenv.config();

@Module({
  imports: [
    AdmUsrModule,
    TokenModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: process.env.TIME_SESSION },
    }),
  ],
  providers: [AuthService, AdmUsrService, JwtAuthGuard],
  controllers: [AuthContoller],
  exports: [AuthService, JwtModule, JwtAuthGuard]
})
export class AuthModule {}

import { AuthController } from 'src/controllers/auth.controller';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';

import { AdmUsrService } from '../service/admusr.service';
import { AuthService } from '../service/auth.service';

import { AdmUsrModule } from './admusr.module';
import { TokenModule } from './token.module';
import { LogModule } from './log.module';
import { JwtModule } from '@nestjs/jwt';
import { Module } from '@nestjs/common';

import * as dotenv from 'dotenv';
dotenv.config(); 

@Module({
  imports: [
    LogModule,
    TokenModule,  
    AdmUsrModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET,  
      signOptions: { expiresIn: process.env.TIME_SESSION }, 
    }),
  ],
  controllers: [AuthController],  
  providers: [
    AuthService,  
    AdmUsrService, 
    JwtAuthGuard,  
  ],
  exports: [AuthService, JwtModule, JwtAuthGuard],
})
export class AuthModule {}

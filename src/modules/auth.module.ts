import { AuthController } from 'src/controllers/auth.controller';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';

import { AdmUsrService } from 'src/service/admusr.service';
import { AuthService } from 'src/service/auth.service';

import { AdmUsrModule } from './admusr.module';
import { TokenModule } from './token.module';  // Asegúrate de importar el TokenModule
import { LogModule } from './log.module';
import { JwtModule } from '@nestjs/jwt';
import { Module } from '@nestjs/common';

import * as dotenv from 'dotenv';
import { DataModule } from './data.module';
dotenv.config(); 

@Module({
  imports: [
    LogModule,
    TokenModule,  
    DataModule,// Asegúrate de que TokenModule esté importado
    AdmUsrModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET,  
      signOptions: { expiresIn: process.env.TIME_SESSION }, 
    }),
  ], 
  controllers: [
    AuthController,
  ], 
  providers: [
    AuthService,  
    JwtAuthGuard,  
    AdmUsrService, 
  ], 
  exports: [
    AuthService, 
    JwtModule, 
    JwtAuthGuard,
  ],
})
export class AuthModule {}
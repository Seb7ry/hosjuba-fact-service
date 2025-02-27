import { AuthController } from 'src/controllers/auth.controller';
import { AdmUsrService } from '../service/admusr.service';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { AuthService } from '../service/auth.service';
import { AdmUsrModule } from './admusr.module';
import { TokenModule } from './token.module';
import { LogModule } from './log.module';
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import * as dotenv from 'dotenv';
dotenv.config();  // Carga las variables del archivo .env

@Module({
  imports: [
    TokenModule,  // Módulo que maneja los tokens
    LogModule,
    AdmUsrModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET,  // Clave secreta para los JWT
      signOptions: { expiresIn: process.env.TIME_SESSION }, // Tiempo de vida del token
    }),
  ],
  providers: [
    AuthService,  // Servicio de autenticación
    AdmUsrService, // Servicio de usuarios
    JwtAuthGuard,  // Guardián de autenticación
  ],
  controllers: [AuthController],  // Controlador que maneja las rutas de autenticación
  exports: [AuthService, JwtModule, JwtAuthGuard],
})
export class AuthModule {}

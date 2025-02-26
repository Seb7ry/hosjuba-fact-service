import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from '../service/auth.service';
import { AdmUsrService } from '../service/admusr.service';
import { AuthController } from 'src/controllers/auth.controller';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { TokenModule } from './token.module';
import { LogModule } from './log.module';
import { AdmUsrModule } from './admusr.module';

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

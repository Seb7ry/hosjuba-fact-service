import { AppController } from './app.controller';

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { AdmUsrModule } from './modules/admusr.module';
import { TokenModule } from './modules/token.module';
import { AuthModule } from './modules/auth.module';
import { LogModule } from './modules/log.module';

import { AppService } from './app.service';

import * as dotenv from 'dotenv';
import { AdmissionsModule } from './modules/admission.module';
import { SignatureModule } from './modules/signature.module';
import { DocumentModule } from './modules/document.module';
import { StatModule } from './modules/stat.module';
dotenv.config();

/**
 * Módulo principal de la aplicación (`AppModule`).
 * 
 * - Configura las conexiones con MongoDB y SQL Server mediante TypeORM y Mongoose.
 * - Importa y registra módulos esenciales como autenticación, tokens y configuración.
 * - Define los controladores y servicios principales.
 */
@Module({
  imports: [
    LogModule,
    AuthModule,
    StatModule,
    TokenModule,
    AdmUsrModule,
    DocumentModule,
    SignatureModule,
    AdmissionsModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forRoot(process.env.MONGO_URI),
  ],
  controllers: [
    AppController, 
  ],
  providers: [
    AppService,
  ],
}) export class AppModule {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  constructor() { }
}

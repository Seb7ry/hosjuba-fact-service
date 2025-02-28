import { AppController } from './app.controller';

import { Module, OnModuleInit } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { AdmUsrModule } from './modules/admusr.module';
import { TokenModule } from './modules/token.module';
import { AuthModule } from './modules/auth.module';
import { LogModule } from './modules/log.module';

import { AdmUsrService } from './service/admusr.service';
import { TokenService } from './service/token.service';
import { AppService } from './app.service';

import { AdmUsr } from './entities/admusr.entity';

import * as dotenv from 'dotenv';
import { AdmissionsModule } from './modules/admission.module';
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
    TokenModule,
    AdmUsrModule,
    AdmissionsModule,
    MongooseModule.forRoot(`mongodb://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}` +
                          `@${process.env.MONGO_HOST}:${process.env.MONGO_PORT}/${process.env.MONGO_DB}?authSource=${process.env.MONGO_AUTH_SOURCE}`),
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
      type: process.env.DB_TYPE as any,  
      host: process.env.DB_HOST,         
      port: parseInt(process.env.DB_PORT, 10),  
      username: process.env.DB_USERNAME,  
      password: process.env.DB_PASSWORD,  
      database: process.env.DB_DATABASE,  
      synchronize: false,  
      options: {
        encrypt: process.env.DB_ENCRYPT === 'true',  
        enableArithAbort: process.env.DB_ENABLE_ARITH_ABORT === 'true',  
      },
      autoLoadEntities: true,  
    }),
    TypeOrmModule.forFeature([AdmUsr]),
  ],
  controllers: [
    AppController, 
  ],
  providers: [
    AppService,
  ],
})
export class AppModule implements OnModuleInit {
  constructor() {}

  /**
   * Método que se ejecuta al iniciar el módulo.
   * Puede ser utilizado para realizar inicializaciones o configuraciones previas.
   */
  async onModuleInit() { }
}

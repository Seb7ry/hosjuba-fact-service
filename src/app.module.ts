import { AppController } from './app.controller';

import { Module, OnModuleInit } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { AdmUsrModule } from './modules/admusr.module';
import { TokenModule } from './modules/token.module';
import { AuthModule } from './modules/auth.module';
import { LogModule } from './modules/log.module';

import { AppService } from './app.service';

import * as dotenv from 'dotenv';
import { AdmissionsModule } from './modules/admission.module';
import { SignatureModule } from './modules/signature.module';
import { SqlServerConnectionModule } from './modules/sqlServerConnection.module';
import { SqlServerConnectionService } from './service/sqlServerConnection.service';
import { HistoryUsrModule } from './modules/historyusr.module';
import { DataModule } from './modules/data.module';
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
    DataModule,
    TokenModule,
    AdmUsrModule,
    SignatureModule,
    HistoryUsrModule,
    AdmissionsModule,
    SqlServerConnectionModule,
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
  ],
  controllers: [
    AppController, 
  ],
  providers: [
    AppService
  ],
})
export class AppModule implements OnModuleInit {
  constructor(private readonly sqlServerConnectionService: SqlServerConnectionService) {}

  /**
   * Método que se ejecuta al iniciar el módulo.
   * Puede ser utilizado para realizar inicializaciones o configuraciones previas.
   */
  async onModuleInit() { 
    await this.sqlServerConnectionService.onModuleInit();
  }
}

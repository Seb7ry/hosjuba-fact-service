import { Module, OnModuleInit } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { AdmUsr } from './entities/admusr.entity';
import { AdmUsrController } from './controllers/admusr.controller';
import { AdmUsrService } from './service/admusr.service';
import * as dotenv from 'dotenv';
import { AuthModule } from './modules/auth.module';
import { MongooseModule } from '@nestjs/mongoose';
import { TokenModule } from './modules/token.module';
import { ScheduleModule } from '@nestjs/schedule';
import { TokenService } from './service/token.service';
import { LogModule } from './modules/log.module';
import { AdmUsrModule } from './modules/admusr.module';

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
    /** Módulo de autenticación (manejo de login, tokens y autenticación JWT) */
    AuthModule,
    /** Módulo para la gestión de tokens en MongoDB */
    TokenModule,
    /** Módulo para la gestión de los logs en MongoDB y en archivo local */
    LogModule,
    AdmUsrModule,
    /** Conexión con MongoDB usando las variables de entorno */
    MongooseModule.forRoot(`mongodb://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}` +
                          `@${process.env.MONGO_HOST}:${process.env.MONGO_PORT}/${process.env.MONGO_DB}?authSource=${process.env.MONGO_AUTH_SOURCE}`),
    /** Módulo de configuración para manejar variables de entorno */
    ConfigModule.forRoot(),
    /** Configuración de TypeORM para conectar con SQL Server */
    TypeOrmModule.forRoot({
      type: process.env.DB_TYPE as any,  // Define el tipo de base de datos (SQL Server en este caso)
      host: process.env.DB_HOST,         // Dirección del servidor de base de datos
      port: parseInt(process.env.DB_PORT, 10),  // Puerto de conexión
      username: process.env.DB_USERNAME,  // Usuario de la base de datos
      password: process.env.DB_PASSWORD,  // Contraseña de la base de datos
      database: process.env.DB_DATABASE,  // Nombre de la base de datos
      synchronize: false,  // Evita sincronización automática de esquemas en producción
      options: {
        encrypt: process.env.DB_ENCRYPT === 'true',  // Habilita la encriptación si está configurada
        enableArithAbort: process.env.DB_ENABLE_ARITH_ABORT === 'true',  // Previene bloqueos de consultas en SQL Server
      },
      autoLoadEntities: true,  // Carga automáticamente las entidades definidas
    }),
    /** Registro del modelo `AdmUsr` en TypeORM */
    TypeOrmModule.forFeature([AdmUsr]),
  ],
  controllers: [
    AppController,  // Controlador principal de la aplicación
  ],
  providers: [
    AppService,  // Servicio principal de la aplicación
    AdmUsrService,  // Servicio para manejar la lógica de los usuarios administrativos
    TokenService,  // Servicio de gestión de tokens
  ],
})
export class AppModule implements OnModuleInit {
  constructor() {}

  /**
   * Método que se ejecuta al iniciar el módulo.
   * Puede ser utilizado para realizar inicializaciones o configuraciones previas.
   */
  async onModuleInit() {
    console.log('✅ Aplicación inicializada correctamente.');
  }
}

import { AdmUsrController } from 'src/controllers/admusr.controller';
import { AdmUsr } from '../model/admusr.model';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LogModule } from './log.module';
import { JwtModule } from '@nestjs/jwt';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AdmUsrService } from 'src/service/admusr.service';

/**
 * Módulo de administración de usuarios (`AdmUsrModule`).
 * 
 * - Importa la entidad `AdmUsr` para su gestión con TypeORM.
 * - Proporciona el servicio `AdmUsrService` para manipulación de datos.
 * - Exporta `AdmUsrService` para que otros módulos puedan usarlo.
 */
@Module({
  imports: [
    LogModule,
    JwtModule        ],
  controllers: [AdmUsrController],
  providers: [AdmUsrService],
  exports: [AdmUsrService],
})
export class AdmUsrModule {}

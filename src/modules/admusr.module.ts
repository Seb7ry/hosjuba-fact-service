import { AdmUsrController } from 'src/controllers/admusr.controller';
import { AdmUsrService } from '../service/admusr.service';
import { AdmUsr } from '../entities/admusr.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LogModule } from './log.module';
import { JwtModule } from '@nestjs/jwt';
import { Module } from '@nestjs/common';

/**
 * Módulo de administración de usuarios (`AdmUsrModule`).
 * 
 * - Importa la entidad `AdmUsr` para su gestión con TypeORM.
 * - Proporciona el servicio `AdmUsrService` para manipulación de datos.
 * - Exporta `AdmUsrService` para que otros módulos puedan usarlo.
 */
@Module({
  imports: [TypeOrmModule.forFeature([AdmUsr]), // Registra la entidad `AdmUsr` en TypeORM
            LogModule,
            JwtModule
            ],
  controllers: [AdmUsrController],
  providers: [AdmUsrService],
  exports: [AdmUsrService],
})
export class AdmUsrModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdmUsrService } from '../service/admusr.service';
import { AdmUsr } from '../entities/admusr.entity';
import { LogModule } from './log.module';

/**
 * Módulo de administración de usuarios (`AdmUsrModule`).
 * 
 * - Importa la entidad `AdmUsr` para su gestión con TypeORM.
 * - Proporciona el servicio `AdmUsrService` para manipulación de datos.
 * - Exporta `AdmUsrService` para que otros módulos puedan usarlo.
 */
@Module({
  imports: [TypeOrmModule.forFeature([AdmUsr]), // Registra la entidad `AdmUsr` en TypeORM
            LogModule], 
  providers: [AdmUsrService], // Define `AdmUsrService` como proveedor del módulo
  exports: [AdmUsrService], // Permite que otros módulos usen `AdmUsrService`
})
export class AdmUsrModule {}

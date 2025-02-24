import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdmUsrService } from '../service/admusr.service';
import { AdmUsr } from '../entities/admusr.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AdmUsr])],
  providers: [AdmUsrService],
  exports: [AdmUsrService],
})
export class AdmUsrModule {}

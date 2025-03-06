import { AdmUsrController } from 'src/controllers/admusr.controller';
import { AdmUsr } from '../model/admusr.model';

import { MongooseModule } from '@nestjs/mongoose';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LogModule } from './log.module';
import { JwtModule } from '@nestjs/jwt';
import { Module } from '@nestjs/common';

import { AdmUsrService } from 'src/service/admusr.service';

@Module({
  imports: [
    LogModule,
    JwtModule,        
  ], 
  controllers: [
    AdmUsrController
  ], 
  providers: [
    AdmUsrService
  ], 
  exports: [
    AdmUsrService
  ],
})
export class AdmUsrModule {}

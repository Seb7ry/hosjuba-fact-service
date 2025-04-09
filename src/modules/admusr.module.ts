import { LogModule } from './log.module';
import { JwtModule } from '@nestjs/jwt';
import { Module } from '@nestjs/common';

import { AdmUsrService } from 'src/service/admusr.service';

@Module({
  imports: [
    LogModule,
    JwtModule,        
  ],
  providers: [
    AdmUsrService
  ], 
  exports: [
    AdmUsrService
  ],
})
export class AdmUsrModule {}

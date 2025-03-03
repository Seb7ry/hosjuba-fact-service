import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AdmissionController } from 'src/controllers/admission.controller';
import { Admission, AdmissionSchema } from 'src/model/admission.model';
import { AdmissionService } from 'src/service/admission.service';
import { LogModule } from './log.module';
import { SignatureModule } from './signature.module';
import { SqlServerConnectionModule } from './sqlServerConnection.module';

@Module({
    imports: [
        LogModule,
        SignatureModule,
        SqlServerConnectionModule,
        MongooseModule.forFeature([{ name: Admission.name, schema: AdmissionSchema }])],
    controllers: [AdmissionController],
    providers: [AdmissionService],
})
export class AdmissionsModule {}

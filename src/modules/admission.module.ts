import { AdmissionController } from 'src/controllers/admission.controller';
import { Admission, AdmissionSchema } from 'src/model/admission.model';

import { SqlServerConnectionModule } from './sqlServerConnection.module';
import { SignatureModule } from './signature.module';
import { MongooseModule } from '@nestjs/mongoose';
import { LogModule } from './log.module';
import { JwtModule } from '@nestjs/jwt';
import { Module } from '@nestjs/common';

import { AdmissionService } from 'src/service/admission.service';
@Module({
    imports: [
        LogModule,
        SignatureModule,
        SqlServerConnectionModule,
        MongooseModule.forFeature([{ name: Admission.name, schema: AdmissionSchema }]),
        JwtModule.register({
            secret: process.env.JWT_SECRET,
            signOptions: { expiresIn: process.env.TIME_SESSION },
        }),
    ],
    controllers: [AdmissionController],
    providers: [AdmissionService],
})
export class AdmissionsModule {}

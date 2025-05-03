import { AdmissionController } from 'src/controllers/admission.controller';
import { Admission, AdmissionSchema } from 'src/model/admission.model';

import { SignatureModule } from './signature.module';
import { MongooseModule } from '@nestjs/mongoose';
import { LogModule } from './log.module';
import { JwtModule } from '@nestjs/jwt';
import { Module } from '@nestjs/common';

import { AdmissionService } from 'src/service/admission.service';
import { TokenModule } from './token.module';

@Module({
    imports: [
        LogModule,
        SignatureModule,
        TokenModule,
        JwtModule.register({
            secret: process.env.JWT_SECRET,
            signOptions: { expiresIn: process.env.TIME_SESSION },
        }),
        MongooseModule.forFeature([{ name: Admission.name, schema: AdmissionSchema }]),
    ], 
    controllers: [
        AdmissionController
    ],
    providers: [AdmissionService
    ],
    exports: [AdmissionService]
})
export class AdmissionsModule { }

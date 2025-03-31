import { Admission, AdmissionSchema } from 'src/model/admission.model';

import { SqlServerConnectionModule } from './sqlServerConnection.module';
import { SignatureModule } from './signature.module';
import { MongooseModule } from '@nestjs/mongoose';
import { LogModule } from './log.module';
import { JwtModule } from '@nestjs/jwt';
import { Module } from '@nestjs/common';

import { DocumentController } from 'src/controllers/document.controller';
import { DocumentService } from 'src/service/document.service';
import { AdmissionService } from 'src/service/admission.service';
import { SignatureService } from 'src/service/signature.service';

@Module({
    imports: [
        LogModule,
        SignatureModule,
        JwtModule.register({
            secret: process.env.JWT_SECRET,
            signOptions: { expiresIn: process.env.TIME_SESSION },
        }),
        SqlServerConnectionModule,
        MongooseModule.forFeature([{ name: Admission.name, schema: AdmissionSchema }]),
    ], 
    controllers: [
        DocumentController
    ],
    providers: [DocumentService, AdmissionService, SignatureService
    ],
})
export class DocumentModule {}

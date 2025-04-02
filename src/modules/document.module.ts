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
import { TokenModule } from './token.module';
import { TokenService } from 'src/service/token.service';
import { AdmUsrModule } from './admusr.module';

@Module({
    imports: [
        LogModule,
        SignatureModule,
        AdmUsrModule,
        TokenModule,
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
    providers: [DocumentService, AdmissionService, SignatureService, TokenService
    ],
    exports: [
        TokenService
    ]
})
export class DocumentModule {}

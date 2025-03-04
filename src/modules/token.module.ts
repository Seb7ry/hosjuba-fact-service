import { TokenController } from 'src/controllers/token.controller';
import { Token, TokenSchema } from 'src/model/token.model';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';

import { AdmUsrService } from 'src/service/admusr.service';
import { TokenService } from 'src/service/token.service';

import { MongooseModule } from '@nestjs/mongoose';
import { AdmUsrModule } from './admusr.module';
import { LogModule } from './log.module';
import { JwtModule } from '@nestjs/jwt';
import { Module } from '@nestjs/common';

import * as dotenv from 'dotenv';
dotenv.config();
@Module({
    imports: [
        LogModule,
        AdmUsrModule,
        MongooseModule.forFeature([{ name: Token.name, schema: TokenSchema }]),
        JwtModule.register({
            secret: process.env.JWT_SECRET,
            signOptions: { expiresIn: process.env.TIME_SESSION },
        }),
    ],
    controllers: [TokenController],
    providers: [
        JwtAuthGuard,
        TokenService,
        AdmUsrService,
    ],
    exports: [TokenService, MongooseModule],
})
export class TokenModule {}

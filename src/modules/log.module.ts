import { LogController } from 'src/controllers/log.controller';
import { Log, LogSchema } from 'src/model/log.model';

import { LogService } from 'src/service/log.service';

import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { Module } from '@nestjs/common';

@Module({
    imports: [
        JwtModule,
        
        JwtModule.register({
            secret: process.env.JWT_SECRET,
            signOptions: { expiresIn: process.env.TIME_SESSION },
        }), 
        MongooseModule.forFeature([{ name: Log.name, schema: LogSchema }]),
    ], 
    controllers: [
        LogController
    ], 
    providers: [
        LogService,
    ], 
    exports: [
        LogService,
        MongooseModule.forFeature([{ name: Log.name, schema: LogSchema }]),
    ]
})
export class LogModule {}

import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { LogController } from 'src/controllers/log.controller';
import { Log, LogSchema } from 'src/model/log.model';
import { LogService } from 'src/service/log.service';

@Module({
    imports: [
        JwtModule,
        MongooseModule.forFeature([{ name: Log.name, schema: LogSchema }]) 
    ],
    controllers: [LogController],
    providers: [LogService],
    exports: [LogService]
})
export class LogModule {}

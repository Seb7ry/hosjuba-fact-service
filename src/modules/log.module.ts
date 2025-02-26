import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Log, LogSchema } from 'src/model/log.model';
import { LogService } from 'src/service/log.service';

@Module({
    imports: [
        MongooseModule.forFeature([{ name: Log.name, schema: LogSchema }]) 
    ],
    providers: [LogService],
    exports: [LogService]
})
export class LogModule {}

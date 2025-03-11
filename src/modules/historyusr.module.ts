import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HistoryUsr, HistoryUsrSchema } from '../model/historyusr.model';
import { HistoryUsrService } from '../service/historyusr.service';
import { HistoryUsrController } from '../controllers/historyusr.controller';
import { LogService } from '../service/log.service';
import { LogModule } from './log.module';
import { JwtModule } from '@nestjs/jwt';

/**
 * Módulo encargado de gestionar el historial de acciones de los usuarios.
 * 
 * Este módulo define el modelo, servicio y controlador de `HistoryUsr`,
 * asegurando la correcta inyección de dependencias y organización dentro de la aplicación.
 */
@Module({
    imports: [
        LogModule,
        JwtModule.register({
            secret: process.env.JWT_SECRET,
            signOptions: { expiresIn: process.env.TIME_SESSION },
        }),
        MongooseModule.forFeature([{ name: HistoryUsr.name, schema: HistoryUsrSchema }]),
    ],
    controllers: [HistoryUsrController],
    providers: [HistoryUsrService],
    exports: [HistoryUsrService],
})
export class HistoryUsrModule {}

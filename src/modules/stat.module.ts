import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { MongooseModule } from "@nestjs/mongoose";
import { Admission, AdmissionSchema } from "src/model/admission.model";
import { StatController } from "src/controllers/stat.controller";
import { StatService } from "src/service/stat.service";
import { LogModule } from "./log.module";

@Module({
    imports: [
        LogModule,
        JwtModule.register({
            secret: process.env.JWT_SECRET,
            signOptions: { expiresIn: process.env.TIME_SESSION },
        }),
        MongooseModule.forFeature([{ name: Admission.name, schema: AdmissionSchema }]),
    ],
    controllers: [
        StatController
    ],
    providers:[
        StatService
    ],
    exports: [
        StatService
    ]
}) 
export class StatModule { }
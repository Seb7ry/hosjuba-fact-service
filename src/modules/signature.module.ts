import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { SignatureService } from "../service/signature.service";
import { SignatureController } from "../controllers/signature.controller";
import { LogModule } from "./log.module";
import { JwtModule } from "@nestjs/jwt";
import { SqlServerConnectionModule } from "./sqlServerConnection.module";
import { Admission, AdmissionSchema } from "src/model/admission.model";

@Module({
    imports: [
        LogModule,
        JwtModule.register({
            secret: process.env.JWT_SECRET,
            signOptions: { expiresIn: process.env.TIME_SESSION },
        }),
        SqlServerConnectionModule,
        MongooseModule.forFeature([{ name: Admission.name, schema: AdmissionSchema }]),
    ],
    controllers: [SignatureController], 
    providers: [SignatureService], 
    exports: [SignatureService],
})
export class SignatureModule {}

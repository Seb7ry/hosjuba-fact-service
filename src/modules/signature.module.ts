import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { SignatureService } from "../service/signature.service";
import { SignatureController } from "../controllers/signature.controller";
import { LogModule } from "./log.module";
import { JwtModule } from "@nestjs/jwt";
import { Admission, AdmissionSchema } from "src/model/admission.model";
import { TokenService } from "src/service/token.service";
import { TokenModule } from "./token.module";

@Module({
    imports: [
        LogModule,
        TokenModule,
        JwtModule.register({
            secret: process.env.JWT_SECRET,
            signOptions: { expiresIn: process.env.TIME_SESSION },
        }),
        MongooseModule.forFeature([{ name: Admission.name, schema: AdmissionSchema }]),
    ],
    controllers: [SignatureController], 
    providers: [SignatureService], 
    exports: [SignatureService],
})
export class SignatureModule {}

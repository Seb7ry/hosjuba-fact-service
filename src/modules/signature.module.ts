import { Module } from "@nestjs/common";
import { SignatureService } from "src/service/signature.service";

@Module({
    providers:[
        SignatureService
    ], 
    exports:[
        SignatureService
    ]
})
export class SignatureModule{}
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Token, TokenSchema } from 'src/model/token.model';
import { TokenService } from 'src/service/token.service';
import { LogModule } from './log.module';
import { JwtModule } from '@nestjs/jwt';
import { AdmUsrModule } from './admusr.module';
import { TokenController } from 'src/controllers/token.controller';

@Module({
    imports: [
        AdmUsrModule,
        MongooseModule.forFeature([{ name: Token.name, schema: TokenSchema }]),
        JwtModule.register({
            secret: process.env.JWT_SECRET,  // Añadir la configuración de JWT si es necesario
            signOptions: { expiresIn: process.env.TIME_SESSION },
        }),
        LogModule,
    ],
    controllers: [TokenController],
    providers: [TokenService],
    exports: [TokenService, MongooseModule],
})
export class TokenModule {}

import { TokenController } from 'src/controllers/token.controller';
import { Token, TokenSchema } from 'src/model/token.model';
import { TokenService } from 'src/service/token.service';
import { MongooseModule } from '@nestjs/mongoose';
import { AdmUsrModule } from './admusr.module';
import { LogModule } from './log.module';
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

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

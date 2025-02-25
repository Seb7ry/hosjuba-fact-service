import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Token, TokenSchema } from 'src/model/token.model';
import { TokenService } from 'src/service/token.service';

@Module({
    imports: [
        MongooseModule.forFeature([{ name: Token.name, schema: TokenSchema }]) 
    ],
    providers: [TokenService],
    exports: [
        TokenService,
        MongooseModule],
})
export class TokenModule {}

import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";

export type TokenDocument = Token & Document;

@Schema({ collection: 'tokens '})
export class Token {
    @Prop({ required: true, unique: true })
    _id: string;

    @Prop({ required: true })
    refreshToken?: string

    @Prop({ required: true, expires: '604800', default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)})
    expiresAt: Date;
}

export const TokenSchema = SchemaFactory.createForClass(Token);
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

export type LogDocument = Log & Document;

@Schema({ collection: 'logsTec', timestamps: true }) 
export class Log {
    @Prop({ required: true })
    level: 'info' | 'warn' | 'error' | 'debug';

    @Prop({ required: true })
    message: string;

    @Prop()
    context?: string; 

    @Prop({ default: new Date() })
    timestamp?: Date;

    @Prop({ default: new Date() })
    expiresAtLogT?: Date;
}

export const LogSchema = SchemaFactory.createForClass(Log);
LogSchema.index({expiresAtLogT: 1}, {expireAfterSeconds: 0});

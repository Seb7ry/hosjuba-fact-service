import { Injectable } from "@nestjs/common";

@Injectable()
export class SignatureService {

    async generateSignature(data: string): Promise<string> {
        const signature = Buffer.from(data).toString('base64');
        return signature;
    }
    
}
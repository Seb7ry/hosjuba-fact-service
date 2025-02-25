import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import * as bcrypt from 'bcrypt';
import { User, UserDocument } from "src/model/user.model";
import { Injectable } from "@nestjs/common";

@Injectable()
export class UserService {
    constructor(@InjectModel(User.name) private userModel: Model<UserDocument>){ }

    async findUserByName(username: string): Promise<User | null>{
        return this.userModel.findOne({username}).exec();
    }

    async updateRefreshToken(userId: string, refreshToken: string): Promise<void>{
        const hashedToken = await bcrypt.hash(refreshToken, 10);
        await this.userModel.updateOne({_id: userId}, {refreshToken: hashedToken});
    }

    async validateRefreshToken(userId: string, refreshToken: string): Promise<boolean> {
        const user = await this.userModel.findById(userId).exec();
        if (!user || !user.refreshToken) return false;

        return bcrypt.compare(refreshToken, user.refreshToken);
    }
}
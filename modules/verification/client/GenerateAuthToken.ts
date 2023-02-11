import { GuildMember } from "discord.js";
import crypto from "crypto";
import { users, verifications } from "../../../database";
import createNewUser from "../../../database/utils/createNewUser";

export interface IVerificationObject {
    target_guild: string;
    target_user: string;
    createdAt: Date;
    _id: string;
    code: number;
}

function generateRandomNumber() {
    var minm = 100000;
    var maxm = 999999;
    return Math.floor(Math.random() * (maxm - minm + 1)) + minm;
}

export default async (
    user: GuildMember
): Promise<{
    status: number;
    message: string;
    data?: IVerificationObject;
}> => {
    const id = crypto.randomBytes(30).toString("hex").slice(30);

    let user_db = await users.findById(user.id);

    if (user_db == null || !user_db) user_db = await createNewUser(user.user);

    const verification_object: IVerificationObject = {
        _id: id,
        code: generateRandomNumber(),
        target_guild: user.guild.id,
        target_user: user.id,
        createdAt: new Date(),
    };

    if (!user_db)
        return {
            status: 404,
            message: "User not found! Try again.",
        };

    const pendingUserVerification = await verifications.findOne({
        target_guild: user.guild.id,
        target_user: user.id,
    });

    if (pendingUserVerification)
        return {
            status: 200,
            message: "Token generated!",
            data: pendingUserVerification.toObject(),
        };

    await verifications.create(verification_object);

    return {
        status: 200,
        message: "Token generated!",
        data: verification_object,
    };
};

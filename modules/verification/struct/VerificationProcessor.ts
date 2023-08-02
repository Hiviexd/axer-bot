import { GuildMember } from "discord.js";
import { AxerBot } from "../../../models/core/AxerBot";
import { UserVerification, UserVerificationType } from "../models/UserVerification";
import { LoggerClient } from "../../../models/core/LoggerClient";
import { verifications } from "../../../database";

export class VerificationProcessor {
    public axer: AxerBot;
    private logger = new LoggerClient("VerificationProcessor");

    constructor(axer: AxerBot) {
        this.axer = axer;
    }

    public async createVerificationFor(member: GuildMember, type: UserVerificationType) {
        const hasPendingHere = await verifications.findOne({
            target_guild: member.guild.id,
            target_user: member.user.id,
        });

        if (hasPendingHere) {
            this.logger.printWarning(
                `Member ${member.user.tag} already has pending verifications on ${member.guild.name} (${member.guild.id})`
            );

            const clonedVerification = new UserVerification(this.axer, member, type);

            const cloneStatus = clonedVerification.cloneFromDatabase(hasPendingHere);

            if (cloneStatus.isError) return cloneStatus;

            return this.createResponse(false, "OK", clonedVerification);
        }

        this.logger.printInfo(
            `Creating verification for member ${member.user.tag} on ${member.guild.name} (${member.guild.id})`
        );

        return this.createResponse(false, "OK", new UserVerification(this.axer, member, type));
    }

    private createResponse(error: boolean, message: string, data: any) {
        return {
            isError: true,
            message,
            data: data || null,
        };
    }
}

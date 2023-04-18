import { EventEmitter } from "ws";
import { discussionEvents } from "../../database";
import { consoleCheck, consoleLog } from "../../helpers/core/logger";
import osuApi from "../../modules/osu/fetcher/osuApi";
import { BeatmapsetEvent, BeatmapsetEventType } from "../../types/beatmap";

export enum WrapperEventType {
    NOMINATE = BeatmapsetEventType.NOMINATE,
    QUALIFY = BeatmapsetEventType.QUALIFY,
    DISQUALIFY = BeatmapsetEventType.DISQUALIFY,
    NOMINATION_RESET = BeatmapsetEventType.NOMINATION_RESET,
    NOMINATION_RESET_RECEIVED = BeatmapsetEventType.NOMINATION_RESET_RECEIVED,
    RANK = BeatmapsetEventType.RANK,
    GENRE_EDIT = BeatmapsetEventType.GENRE_EDIT,
    LANGUAGE_EDIT = BeatmapsetEventType.LANGUAGE_EDIT,
    NSFW_TOGGLE = BeatmapsetEventType.NSFW_TOGGLE,
    OFFSET_EDIT = BeatmapsetEventType.OFFSET_EDIT,
    TAGS_EDIT = BeatmapsetEventType.TAGS_EDIT,
}

abstract class DiscussionEventEmitter extends EventEmitter {
    constructor() {
        super();
    }

    on(
        eventEvent: WrapperEventType | string | symbol,
        callback: (data: BeatmapsetEvent) => void
    ) {
        return this;
    }
}

export class DiscussionEventsManager {
    private allowList = [
        BeatmapsetEventType.NOMINATE,
        BeatmapsetEventType.QUALIFY,
        BeatmapsetEventType.DISQUALIFY,
        BeatmapsetEventType.NOMINATION_RESET,
        BeatmapsetEventType.NOMINATION_RESET_RECEIVED,
        BeatmapsetEventType.RANK,
        BeatmapsetEventType.ISSUE_REOPEN,
        BeatmapsetEventType.ISSUE_RESOLVE,
        BeatmapsetEventType.GENRE_EDIT,
        BeatmapsetEventType.LANGUAGE_EDIT,
        BeatmapsetEventType.NSFW_TOGGLE,
        BeatmapsetEventType.OFFSET_EDIT,
        BeatmapsetEventType.TAGS_EDIT,
    ];
    public events = new EventEmitter() as DiscussionEventEmitter;

    constructor() {
        this.events.emit.bind(this);
    }

    async tryToInsertNewEvent(event: BeatmapsetEvent) {
        this.events.emit.bind(this);

        try {
            if (!this.allowList.includes(event.type))
                return {
                    status: 400,
                    data: {
                        message: `Don't index ${event.type}`,
                    },
                };

            const exists = await discussionEvents.findById(event.id);

            if (exists)
                return {
                    status: 201,
                    data: {
                        message: "Exists",
                    },
                };

            const response = await discussionEvents.create({
                _id: event.id,
                beatmapId: event.discussion?.beatmap?.id,
                beatmapsetId: event.beatmapset.id,
                content: event.discussion?.starting_post.message,
                createdAt: new Date(event.created_at),
                discussionId: event.comment?.beatmap_discussion_id,
                discussionPostId: event.comment?.beatmap_discussion_post_id,
                type: event.type,
                userId: event.user_id,
                comment: event.comment,
            });

            consoleCheck(
                `DiscussionEventsManager`,
                `Inserted event ${event.id} with type ${event.type}`
            );

            this.events.emit(event.type, event);

            return {
                status: 200,
                data: response,
            };
        } catch (e) {
            console.error(e);

            return {
                status: 500,
                data: e,
            };
        }
    }

    async listen(): Promise<unknown> {
        consoleLog(`DiscussionEventsManager`, `Starting listener`);
        const events = await osuApi.fetch.allBeatmapsetEvents(this.allowList);

        if (events.status != 200)
            return setTimeout(this.listen.bind(this), 30000);

        for (const event of events.data.events) {
            await this.tryToInsertNewEvent(event);
        }

        setTimeout(this.listen.bind(this), 30000);
    }
}

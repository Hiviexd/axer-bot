import { BeatmapsetDiscussionPost } from "../../types/beatmap";
import {
	Message,
	MessageActionRow,
	MessageAttachment,
	MessageButton,
	MessageEmbed,
} from "discord.js";
import getHighestUsergroup from "../../helpers/osu/player/getHighestUsergroup";
import osuApi from "../../helpers/osu/fetcher/osuApi";
import generatePostEmbedDecoration from "../../helpers/text/embeds/generatePostEmbedDecoration";
import storeBeatmap from "../../helpers/osu/fetcher/general/storeBeatmap";

export default {
	send: async (
		post: BeatmapsetDiscussionPost,
		raw_posts: BeatmapsetDiscussionPost,
		type: string,
		message: Message
	) => {
		if (post.posts.length < 1) return;
		const author = await osuApi.fetch.user(String(post.posts[0].user_id));
		const usergroup = getHighestUsergroup(author.data); // ? Get the highest usergroup

		const embedDecoration = generatePostEmbedDecoration(
			raw_posts,
			post,
			type
		);

		let e = new MessageEmbed({
			description: checkContent(),
			color: embedDecoration.color,
			title: embedDecoration.title,
			thumbnail: {
				url: `https://b.ppy.sh/thumb/${post.beatmapsets[0].id}l.jpg`,
			},
			footer: {
				iconURL: `https://a.ppy.sh/${post.posts[0].user_id}`,
				text: `${author.data.username} ${
					usergroup.name ? `(${usergroup.name})` : ""
				}`,
			},
		});

		const buttons = new MessageActionRow();
		buttons.addComponents([
			new MessageButton({
				type: "BUTTON",
				style: "LINK",
				url: `https://osu.ppy.sh/s/${post.beatmapsets[0].id}`,
				label: "Beatmap Page",
			}),
			new MessageButton({
				type: "BUTTON",
				style: "LINK",
				url: `https://osu.ppy.sh/users/${post.beatmapsets[0].user_id}`,
				label: "Mapper Profile",
			}),
		]);

		const beatmap_file = await osuApi.download.beatmapset(
			post.beatmapsets[0].id.toString()
		);

		const stored_file = await storeBeatmap(
			beatmap_file,
			post.beatmapsets[0],
			message
		);

		if (!stored_file.big) {
			buttons.addComponents([
				new MessageButton({
					type: "BUTTON",
					style: "LINK",
					url: stored_file.url,
					label: "Download Beatmap",
				}),
			]);
		}

		message.reply({
			embeds: [e],
			components: [buttons],
			allowedMentions: {
				repliedUser: false,
			},
		});

		function checkContent() {
			if (post.posts[0].message.length <= 2000)
				return post.posts[0].message;

			return post.posts[0].message.slice(0, 2000) + " **[truncated]**";
		}
	},
};
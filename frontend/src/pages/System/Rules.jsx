import React from "react";
import GenericRoutePage from "../../components/GenericRoutePage";

const rules = [
	{ title: "Keep it respectful", description: "No harassment, hate speech, or targeted abuse in public rooms and comments.", meta: "Rule 1", badge: "Core" },
	{ title: "No spam or bait", description: "Avoid repetitive posting, bait threads, and disruptive link drops.", meta: "Rule 2", badge: "Community" },
	{ title: "Spoiler discipline", description: "Mark spoilers clearly and avoid leaking major story beats without warning.", meta: "Rule 3", badge: "Etiquette" },
	{ title: "Follow moderator calls", description: "Use the appeal flow if needed, but respect active moderation decisions.", meta: "Rule 4", badge: "Moderation" },
];

export default function Rules() {
	return (
		<GenericRoutePage
			eyebrow="System"
			title="Community rules"
			description="The enforcement baseline for posts, rooms, and reports across the app."
			stats={[
				{ value: "4", label: "core rules" },
				{ value: "24h", label: "review window" },
				{ value: "Fair", label: "enforcement goal" },
			]}
			actions={[
				{ label: "Report issue", to: "/help" },
				{ label: "Submit report", to: "/report", variant: "secondary" },
			]}
			sections={[
				{
					heading: "Rules",
					description: "Short, enforceable expectations for the platform.",
					items: rules,
				},
			]}
		/>
	);
}

import React, { useState, useEffect } from "react";
import GenericRoutePage from "../../components/GenericRoutePage";
import configService from "../../services/configService";

export default function Rules() {
	const [rules, setRules] = useState([]);

	useEffect(() => {
		configService.getRules().then(res => {
			if (res.success) setRules(res.data);
		}).catch(() => {});
	}, []);

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

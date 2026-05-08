import React, { useState } from "react";
import GenericRoutePage from "../../components/GenericRoutePage";

export default function Report() {
	const [submitted, setSubmitted] = useState(false);

	return (
		<GenericRoutePage
			eyebrow="System"
			title="Report a problem"
			description="Send moderation, bug, or content reports through a simple queue the team can act on."
			stats={[
				{ value: "Fast", label: "response target" },
				{ value: "3", label: "report types" },
				{ value: "Ready", label: "queue state" },
			]}
			actions={[
				{ label: "Read rules", to: "/system/rules" },
				{ label: "Open help", to: "/help", variant: "secondary" },
			]}
		>
			<section className="generic-route-section">
				<div className="generic-route-section-head">
					<div>
						<h2>Report form</h2>
						<p>Choose the issue, add a short note, and submit it to the review queue.</p>
					</div>
				</div>

				{submitted ? (
					<article className="generic-route-card">
						<h3>Report sent</h3>
						<p>Your submission is in the queue and will be reviewed by the moderation team.</p>
					</article>
				) : (
					<form
						className="generic-report-form"
						onSubmit={(event) => {
							event.preventDefault();
							setSubmitted(true);
						}}
					>
						<label>
							Category
							<select defaultValue="bug">
								<option value="bug">Bug</option>
								<option value="content">Content</option>
								<option value="moderation">Moderation</option>
							</select>
						</label>
						<label>
							Details
							<textarea rows="5" placeholder="Describe what happened, where it happened, and what you expected." />
						</label>
						<button type="submit" className="generic-route-action primary">
							Submit report
						</button>
					</form>
				)}
			</section>
		</GenericRoutePage>
	);
}

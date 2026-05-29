import React, { useState } from "react";
import GenericRoutePage from "../../components/GenericRoutePage";
import reportService from "../../services/reportService";
import useDocumentTitle from "../../hooks/useDocumentTitle";

export default function Report() {
	useDocumentTitle("Report an Issue");
	const [submitted, setSubmitted] = useState(false);
	const [sending, setSending] = useState(false);
	const [category, setCategory] = useState("bug");
	const [details, setDetails] = useState("");
	const [error, setError] = useState("");

	const handleSubmit = async (e) => {
		e.preventDefault();
		if (!details.trim()) { setError("Please provide details"); return; }
		setSending(true);
		setError("");
		try {
			await reportService.submit({ category, details });
			setSubmitted(true);
		} catch {
			setError("Failed to submit. Try again later.");
		}
		setSending(false);
	};

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
					<form className="generic-report-form" onSubmit={handleSubmit}>
						<label>
							Category
							<select value={category} onChange={(e) => setCategory(e.target.value)}>
								<option value="bug">Bug</option>
								<option value="content">Content</option>
								<option value="moderation">Moderation</option>
							</select>
						</label>
						<label>
							Details
							<textarea rows="5" value={details} onChange={(e) => setDetails(e.target.value)} placeholder="Describe what happened, where it happened, and what you expected." />
						</label>
						{error && <p className="generic-route-error">{error}</p>}
						<button type="submit" className="generic-route-action primary" disabled={sending}>
							{sending ? "Sending..." : "Submit report"}
						</button>
					</form>
				)}
			</section>
		</GenericRoutePage>
	);
}

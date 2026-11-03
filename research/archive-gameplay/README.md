# Archive gameplay research team

This folder holds **75 proposed use cases** inspired by historical telecom operations mailing lists. The catalogue is research input for the synthetic Series of Calls training simulator. It does not add missions, change the implementation, update the formal specification, or mark any requirement accepted.

- [Readable catalogue](catalogue.md) and [structured catalogue](catalogue.json): the same 75 proposals, with archive evidence, cause status, gameplay decision and direct source link.
- [Agent briefs](agents/): reusable prompts for three archive researchers and a source editor. The three research roles were deployed in this pass using lower cost GPT-6 Luna agents; the source editor role was handled by the coordinating agent.
- [Raw agent notes](raw/): 83 individually linked candidates before editorial selection. These are unreviewed working notes; use the 75-case catalogue for planning.

## Method and limits

The researchers searched original Cisco VoIP and VoiceOps archives across 2005–2022, read individual messages and selected follow-ups, and paraphrased their symptoms and evidence. This was a bounded search, not a complete archive crawl. Eight candidates were removed from the catalogue because they were generic questions, procurement or upgrade planning without a distinct service failure, or overlapped another case. The remaining 75 have unique archive URLs and distinct gameplay proposals. Eight of those URLs already appear in the existing community research registers; 67 add new source links to this research collection. URL uniqueness is a structural check, not proof that two posts never share a discussion thread.

The source statuses are **thread-reported**, **proposed**, or **unknown**. A reported resolution is evidence about that historical deployment, not a verified modern product rule. The fictional gameplay proposal may supply a synthetic root cause where the original thread did not. Do not present that synthetic cause as a finding from the archive. Some archive pages may be temporarily inaccessible to a reader; re-open the source and follow-up before promoting a proposal into the versioned specification.

The existing [Cisco VoIP](../community/cisco-voip-findings.json) and [VoiceOps](../community/voiceops-findings.json) research registers provide more detailed adaptation and acceptance sketches for a smaller set of threads. Catalogue entries can overlap those registers; they do not replace them.

## Adoption path

For each selected case, define the desired configuration, provisioning result, effective state and observed service; specify at least one successful solution and one meaningful failing configuration; use fictional organizations, endpoints, numbers and providers. Then review the source and record the accepted behaviour in the specification and acceptance plan. This catalogue alone asserts no implementation coverage.

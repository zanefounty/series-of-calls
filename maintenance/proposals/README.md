# Prepared governance proposal

`deployment-checks.patch` is a reviewable proposal, not an applied policy or verified hosted protection. It includes translations in the CI aggregate and restricts the manually dispatched Pages build to main. This follows the existing main-branch deployment intent; changing to protected release tags requires a deliberate replacement policy.

AGENTS.md and DEC-019 require governance changes in a separate owner-reviewed PR. Once genuine history and the independent repository exist, put this patch in that PR, run workflow validation and the required checks, and verify the actual branch/environment protections. Do not enable adaptation or change budgets as part of it. The task authorizes preparation; this proposal preserves the required final owner review.

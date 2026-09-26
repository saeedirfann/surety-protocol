# Sponsor submission disclosure

Current prize eligibility must be checked against your event's rules. Do not claim completed integrations or fabricated API experience.

## World
Surety gates operator registration and claim filing through an identity-verifier interface. WorldIDGate includes a World router verifyProof call with caller-bound signals and nullifier protection; the demo uses a local mock, not a genuine IDKit/sandbox proof. A real app and proof flow are still required for an integration-based prize claim.

Code: https://github.com/saeedirfann/surety-protocol/blob/main/contracts/src/WorldIDGate.sol#L23

Ease score: not evaluated against the live protocol. Leave default 0 if required rather than inventing a score.

Feedback: an end-to-end sandbox example covering IDKit, action/nullifier configuration, verifier deployment and testnet proofs would help onboarding. This is an integration need, not tested API feedback.

## Uniswap Foundation
No Uniswap contracts, hooks, SDK, router or swaps are implemented. Do not apply based on current code. No legitimate integration code link or live-use rating exists. Feedback: not evaluated.

## Curvegrid
Surety stores public spend limits, allowlists and approval thresholds, but the demo previews policy locally. No MultiBaas API/deployment is configured. Do not claim a completed Curvegrid integration.

Related fallback only, not sponsor usage: https://github.com/saeedirfann/surety-protocol/blob/main/web/src/app/api/demo/route.ts

Ease score: not evaluated; default 0 if required. Feedback: a runnable policy-aware agent example covering deployment, policy checks, approvals and local fallback would help onboarding. No live API behavior was tested.

## Other technologies actually used
UMA Optimistic Oracle V3, OpenZeppelin, Foundry/Anvil, Ponder, viem, wagmi, RainbowKit, Next.js, React and Tailwind.

Only select technologies present in your event's partner list. EAS is installed/interface-tested, not an attestation integration. ENS, Intercepta, 1inch and hosted Chainlink/Gelato are not connected. World mock identity is not genuine World verification. Actual Vercel deployment requires the owner's account.

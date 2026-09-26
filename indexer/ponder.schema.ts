import { onchainTable } from "ponder";

export const localBlock = onchainTable("local_block", (t) => ({
  number: t.bigint().primaryKey(),
  hash: t.hex().notNull(),
  timestamp: t.bigint().notNull(),
}));

export const agent = onchainTable("agent", t => ({
  id: t.bigint().primaryKey(), operator: t.hex().notNull(), vault: t.hex().notNull(), metadata: t.text().notNull(),
  bond: t.bigint().notNull(), reserved: t.bigint().notNull(), maxTxValue: t.bigint().notNull(), approvalAbove: t.bigint().notNull(),
  allowedContracts: t.text().notNull(), allowedSelectors: t.text().notNull(), paidClaims: t.bigint().notNull(), totalPaid: t.bigint().notNull(),
}));
export const claim = onchainTable("claim", t => ({
  id: t.hex().primaryKey(), agentId: t.bigint().notNull(), claimant: t.hex().notNull(), damages: t.bigint().notNull(), bond: t.bigint().notNull(),
  deadline: t.bigint().notNull(), status: t.text().notNull(), evidence: t.text().notNull(), filedAt: t.bigint().notNull(), txHash: t.hex().notNull(),
}));

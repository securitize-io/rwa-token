import { type IdlAccounts, type IdlTypes } from "@anchor-lang/core";
import { type PolicyEngineIdlTypes } from "../programs";

/** Represents on chain policy. */
export type PolicyType = IdlTypes<PolicyEngineIdlTypes>["policyType"];
export type PolicyTypeMinMaxBalance = IdlTypes<PolicyEngineIdlTypes>["policyType"]["minMaxBalance"];

/** Represents on chain filter for identity used by the policy engine. */
export type IdentityFilter = IdlTypes<PolicyEngineIdlTypes>["identityFilter"];

/** Represents on chain tracker account pda. */
export type TrackerAccount = IdlAccounts<PolicyEngineIdlTypes>["trackerAccount"];

export type HolderLimit = IdlTypes<PolicyEngineIdlTypes>["counterLimit"]["holdersLimit"];
export type GroupedHolderLimit = IdlTypes<PolicyEngineIdlTypes>["counterLimit"]["groupedHoldersLimit"];
export type PercentageLimit = IdlTypes<PolicyEngineIdlTypes>["counterLimit"]["percentageLimit"];
export type CounterLimit = IdlTypes<PolicyEngineIdlTypes>["counterLimit"];


export type IdentityLevel = IdlTypes<PolicyEngineIdlTypes>["identityLevel"];

export type Counter = IdlTypes<PolicyEngineIdlTypes>["counter"];

/** Represents on chain policy. */
export type Policy = IdlTypes<PolicyEngineIdlTypes>["policy"];

/** Represents on chain policy engine account. */
export type PolicyEngineAccount =
  IdlAccounts<PolicyEngineIdlTypes>["policyEngineAccount"];

export type IdentityFilterSimple = IdlTypes<PolicyEngineIdlTypes>["identityFilter"]["simple"];
export type IdentityFilterIfThen = IdlTypes<PolicyEngineIdlTypes>["identityFilter"]["ifThen"];

export type FilterInner = IdlTypes<PolicyEngineIdlTypes>["filterInner"];
export type FilterInnerSingle = IdlTypes<PolicyEngineIdlTypes>["filterInner"]["single"];
export type FilterInnerTuple = IdlTypes<PolicyEngineIdlTypes>["filterInner"]["tuple"];
export type FilterInnerMultiple = IdlTypes<PolicyEngineIdlTypes>["filterInner"]["multiple"];

export type Data = IdlTypes<PolicyEngineIdlTypes>["filterData"];
export type FilterLevel = IdlTypes<PolicyEngineIdlTypes>["filterLevel"];
export type FilterTarget = IdlTypes<PolicyEngineIdlTypes>["filterTarget"];
export type FilterMode = IdlTypes<PolicyEngineIdlTypes>["filterMode"];

export type IssuancePolicies = IdlTypes<PolicyEngineIdlTypes>["issuancePolicies"];

export type Lock = IdlTypes<PolicyEngineIdlTypes>["lock"];
export type Issuance = IdlTypes<PolicyEngineIdlTypes>["issuance"];

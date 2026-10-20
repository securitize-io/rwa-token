use anchor_lang::prelude::*;

use crate::{CounterLimit, IdentityFilter, IssuancePolicies, PolicyType};

#[event]
pub struct TransferEvent {
    pub from: Pubkey,
    pub to: Pubkey,
    pub amount: u64,
}

#[event]
pub struct LockEvent {
    pub amount: u64,
    pub release_timestamp: i64,
    pub reason: u64,
    pub reason_string: String,
    pub identity: Pubkey,
}

#[event]
pub struct UnlockEvent {
    pub amount: u64,
    pub release_timestamp: i64,
    pub reason: u64,
    pub reason_string: String,
    pub identity: Pubkey,
}

#[event]
pub struct IssuancesPrunedEvent {
    pub mint: Pubkey,
    pub identity: Pubkey,
    pub timestamp: i64,
    pub lock_time: i64,
    pub removed_count: u64,
    pub remaining_count: u64,
}

#[event]
pub struct ChangedCounterLimitsEvent {
    pub mint: Pubkey,
    pub removed_counter_limits: Vec<CounterLimit>,
    pub added_counter_limits: Vec<CounterLimit>,
}

#[event]
pub struct ChangedCountersEvent {
    pub mint: Pubkey,
    pub removed_counters: Vec<u8>,
    pub added_counters: Vec<u8>
}

#[event]
pub struct ChangedIssuancePoliciesEvent {
    pub mint: Pubkey,
    pub issuance_policies: IssuancePolicies,
    pub previous_issuance_policies: IssuancePolicies
}

#[event]
pub struct ChangedMappingEvent {
    pub mint: Pubkey,
    pub mapping_source: Vec<u8>,
    pub mapping_value: Vec<u8>,
    pub previous_mapping: Vec<u8>
}

#[event]
pub struct SetCounterValueEvent {
    pub mint: Pubkey,
    pub counters: Vec<u8>,
    pub values: Vec<u64>
}

#[event]
pub struct AttachPolicyEvent {
    pub mint: Pubkey,
    pub policy_type: PolicyType,
    pub identity_filter: IdentityFilter,
    pub custom_error: u8
}

#[event]
pub struct DetachPolicyEvent {
    pub mint: Pubkey,
    pub policy_type: PolicyType,
    pub identity_filter: IdentityFilter,
    pub custom_error: u8
}

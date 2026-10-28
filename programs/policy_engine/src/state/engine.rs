use anchor_lang::{prelude::*, AnchorSerialize};
use identity_registry::IdentityLevel;
use num_enum::IntoPrimitive;
use serde::{Deserialize, Serialize};

use crate::{get_custom_error, PolicyEngineErrors, US_COMPLIANCE_LEVEL};

use super::TrackerAccount;

#[repr(u8)]
#[derive(
    IntoPrimitive,
    AnchorDeserialize,
    AnchorSerialize,
    Clone,
    InitSpace,
    Copy,
    Debug,
    Serialize,
    Deserialize,
)]
pub enum ComparisionType {
    Or,
    And,
    Except,
}

#[repr(u8)]
#[derive(
    IntoPrimitive,
    AnchorDeserialize,
    AnchorSerialize,
    Clone,
    InitSpace,
    Copy,
    Debug,
    Serialize,
    Deserialize,
    PartialEq,
)]
pub enum CounterpartyFilter {
    Sender,
    Receiver,
    Both,
}

#[repr(u8)]
#[derive(
    IntoPrimitive,
    AnchorDeserialize,
    AnchorSerialize,
    Clone,
    InitSpace,
    Debug,
    Serialize,
    Deserialize,
    PartialEq,
)]
pub enum FilterTarget {
    Sender,
    Receiver,
    BothAnd,
    BothOr,
}

#[repr(u8)]
#[derive(
    IntoPrimitive,
    AnchorDeserialize,
    AnchorSerialize,
    Clone,
    InitSpace,
    Debug,
    Serialize,
    Deserialize,
    PartialEq,
)]
pub enum FilterMode {
    Include,
    Exclude,
}

#[repr(u8)]
#[derive(
    IntoPrimitive,
    AnchorDeserialize,
    AnchorSerialize,
    Clone,
    InitSpace,
    Debug,
    Serialize,
    Deserialize,
    PartialEq,
)]
pub enum FilterComparison {
    Or,
    And,
}

#[repr(u8)]
#[derive(
    AnchorDeserialize, AnchorSerialize, Clone, InitSpace, Debug, Serialize, Deserialize, PartialEq,
)]
pub enum IdentityFilter {
    Simple(FilterInner),
    IfThen(FilterInner, FilterInner),
}

#[repr(u8)]
#[derive(
    AnchorDeserialize, AnchorSerialize, Clone, InitSpace, Debug, Serialize, Deserialize, PartialEq,
)]
pub enum FilterInner {
    Single(FilterData),
    Tuple(FilterData, FilterComparison, FilterData),
    Multiple(FilterComparison, #[max_len(0)] Vec<FilterData>),
}

#[derive(
    AnchorDeserialize, AnchorSerialize, Clone, InitSpace, Debug, Serialize, Deserialize, PartialEq,
)]
pub struct FilterData {
    level: FilterLevel,
    target: FilterTarget,
    mode: FilterMode,
}

#[derive(
    AnchorDeserialize, AnchorSerialize, Clone, InitSpace, Debug, Serialize, Deserialize, PartialEq,
)]
pub enum FilterLevel {
    Level(u8),
    LevelMappingAny(u8),
    LevelMapping { source: u8, target: u8 },
    Country(u8),
    CountryMapping(u8),
}

impl IdentityFilter {
    pub fn get_space(&self) -> usize {
        match self {
            IdentityFilter::Simple(filter) => 1 + filter.get_space(),
            IdentityFilter::IfThen(filter, then_filter) => {
                1 + filter.get_space() + then_filter.get_space()
            }
        }
    }
}

impl FilterInner {
    pub fn get_space(&self) -> usize {
        match self {
            FilterInner::Single(_) => FilterData::INIT_SPACE,
            FilterInner::Tuple(_, _, _) => 2 * FilterData::INIT_SPACE + 1,
            FilterInner::Multiple(_, filters) => filters.len() * FilterData::INIT_SPACE + 1,
        }
    }
}

#[account()]
#[derive(InitSpace)]
pub struct PolicyEngineAccount {
    /// version
    pub version: u8,
    /// asset mint
    pub asset_mint: Pubkey,
    /// authority of the registry
    pub authority: Pubkey,
    /// generic mapping for levels
    pub mapping: [u8; 256],
    /// policies to apply on issuance
    /// these are partially for storage only
    pub issuance_policies: IssuancePolicies,
    /// policies to check on transfers or balance changes
    #[max_len(0)]
    pub policies: Vec<Policy>,
    /// counters to track the number of holders depending on filters
    #[max_len(0)]
    pub counters: Vec<Counter>,
    /// limits to apply on existing counters
    #[max_len(0)]
    pub counter_limits: Vec<CounterLimit>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, InitSpace, Debug)]
pub struct IssuancePolicies {
    pub disallow_backdating: bool,
    pub max_supply: u64,
    pub us_lock_period: i64,
    pub non_us_lock_period: i64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, InitSpace, Debug)]
pub struct Counter {
    pub value: u64,
    pub id: u8,
    pub identity_filter: IdentityFilter,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, InitSpace, Debug)]
pub enum CounterLimit {
    HoldersLimit {
        max: u64,
        min: u64,
        counter_id: u8,
    },
    GroupedHoldersLimit {
        max: u64,
        min: u64,
        #[max_len(0)]
        counters: Vec<u8>,
    },
    PercentageLimit {
        higher_counter_id: u8,
        lower_counter_id: u8,
        min_percentage: u8,
        max_percentage: u8,
    },
}

impl CounterLimit {
    pub fn get_space(&self) -> usize {
        match self {
            CounterLimit::GroupedHoldersLimit {
                max: _,
                min: _,
                counters,
            } => CounterLimit::INIT_SPACE + counters.len(),
            _ => CounterLimit::INIT_SPACE,
        }
    }
}

impl Counter {
    pub fn get_space(&self) -> usize {
        self.identity_filter.get_space() + 9
    }

    pub fn get_new_space(filter: &IdentityFilter) -> usize {
        filter.get_space() + 9
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, InitSpace, Debug)]
pub struct Policy {
    #[max_len(64)]
    pub hash: String,
    pub identity_filter: IdentityFilter,
    pub policy_type: PolicyType,
    pub custom_error: u8,
}

impl Policy {
    pub fn get_space(&self) -> usize {
        self.identity_filter.get_space() + PolicyType::INIT_SPACE + 69
    }

    pub fn get_new_space(filter: &IdentityFilter) -> usize {
        filter.get_space() + PolicyType::INIT_SPACE + 69
    }
}

#[derive(
    AnchorSerialize, AnchorDeserialize, Clone, InitSpace, PartialEq, Debug, Serialize, Deserialize,
)]
pub enum PolicyType {
    IdentityApproval,
    TransactionAmountLimit { limit: u64 },
    /*TransactionAmountVelocity { limit: u64, timeframe: i64 },
    TransactionCountVelocity { limit: u64, timeframe: i64 },*/
    MaxBalance { limit: u64 },
    MinBalance { limit: u64 },
    MinMaxBalance { min: u64, max: u64 },
    TransferPause,
    ForbiddenIdentityGroup,
    ForceFullTransfer,
    BlockFlowbackEndTime { time: i64 },
}

pub fn get_policy_engine_pda(asset_mint: Pubkey) -> Pubkey {
    let (pda, _) = Pubkey::find_program_address(&[&asset_mint.to_bytes()], &crate::ID);
    pda
}

impl PolicyEngineAccount {
    pub const VERSION: u8 = 1;
    pub fn new(
        authority: Pubkey,
        asset_mint: Pubkey,
    ) -> Self {
        Self {
            version: Self::VERSION,
            authority,
            asset_mint,
            mapping: [0; 256],
            issuance_policies: IssuancePolicies {
                disallow_backdating: false,
                max_supply: 0,
                us_lock_period: 0,
                non_us_lock_period: 0,
            },
            policies: vec![],
            counters: vec![],
            counter_limits: vec![],
        }
    }

    pub fn change_mapping(&mut self, mapping_source: Vec<u8>, mapping_value: Vec<u8>) {
        for (src, dst) in mapping_source.iter().zip(mapping_value.iter()) {
            self.mapping[*src as usize] = *dst;
        }
    }

    pub fn change_issuance_policies(&mut self, issuance_policies: IssuancePolicies) -> Result<()> {
        require!(
            issuance_policies.us_lock_period >= 0 && issuance_policies.non_us_lock_period >= 0,
            PolicyEngineErrors::InvalidLockPeriod
        );
        self.issuance_policies = issuance_policies;
        Ok(())
    }

    /// Holding period for the identity's current country classification.
    pub fn get_lock_period(&self, country: u8) -> i64 {
        if self.mapping[country as usize] == US_COMPLIANCE_LEVEL {
            self.issuance_policies.us_lock_period
        } else {
            self.issuance_policies.non_us_lock_period
        }
    }

    pub fn get_policy_space(&self, hash: &str) -> Result<usize> {
        if let Some(index) = self.policies.iter().position(|policy| policy.hash == hash) {
            return Ok(self.policies[index].get_space());
        }
        Err(PolicyEngineErrors::PolicyNotFound.into())
    }

    pub fn get_counter_space_change(removed_counters: &[u8], added_counters: &[Counter]) -> usize {
        let mut space_change = 0;
        for _ in removed_counters.iter() {
            space_change -= Counter::INIT_SPACE;
        }
        for counter in added_counters.iter() {
            space_change += Counter::get_new_space(&counter.identity_filter);
        }
        space_change
    }

    pub fn hash_policy(
        policy_account: Pubkey,
        policy_type: &PolicyType,
        identity_filter: &IdentityFilter,
    ) -> String {
        let hash = format!("{:?}{:?}{:?}", policy_account, policy_type, identity_filter);
        sha256::digest(hash.as_bytes())
    }

    pub fn attach(
        &mut self,
        policy_account: Pubkey,
        policy_type: PolicyType,
        identity_filter: IdentityFilter,
        custom_error: u8,
    ) -> Result<()> {
        let hash = Self::hash_policy(policy_account, &policy_type, &identity_filter);
        if self.policies.iter().any(|policy| policy.hash == hash) {
            return Err(PolicyEngineErrors::PolicyAlreadyExists.into());
        }
        self.policies.push(Policy {
            hash,
            identity_filter,
            policy_type,
            custom_error,
        });
        Ok(())
    }

    pub fn detach(&mut self, hash: String) -> Result<Policy> {
        if let Some(index) = self.policies.iter().position(|policy| policy.hash == hash) {
            return Ok(self.policies.remove(index));
        }
        Err(PolicyEngineErrors::PolicyNotFound.into())
    }

    pub fn get_issuance_time(&self, issuance_timestamp: i64, cluster_time: i64) -> i64 {
        if self.issuance_policies.disallow_backdating {
            return cluster_time;
        }
        issuance_timestamp
    }

    pub fn enforce_policy_issuance(
        &self,
        supply: u64,
        identity: &[IdentityLevel],
        country: u8,
        tracker_account: Option<&TrackerAccount>,
    ) -> Result<()> {
        require!(
            self.issuance_policies.max_supply == 0 || self.issuance_policies.max_supply >= supply,
            PolicyEngineErrors::MaxSupplyExceeded
        );

        for policy in self.policies.iter() {
            match &policy.policy_type {
                PolicyType::IdentityApproval => {
                    if self.enforce_filters_single(
                        identity,
                        country,
                        &policy.identity_filter,
                    ).is_err() {
                        get_custom_error(policy.custom_error, PolicyEngineErrors::IdentityFilterFailed)?;
                    }
                }
                PolicyType::MaxBalance { limit } => {
                    if self
                        .enforce_filters_single(
                            identity,
                            country,
                            &policy.identity_filter,
                        )
                        .is_ok()
                    {
                        if let Some(dst_tracker) = tracker_account {
                            if dst_tracker.total_amount > *limit {
                                get_custom_error(policy.custom_error, PolicyEngineErrors::MaxBalanceExceeded)?;
                            }
                        }
                    }
                }
                PolicyType::MinBalance { limit } => {
                    if self
                        .enforce_filters_single(
                            identity,
                            country,
                            &policy.identity_filter,
                        )
                        .is_ok()
                    {
                        if let Some(dst_tracker) = tracker_account {
                            if dst_tracker.total_amount < *limit {
                                get_custom_error(policy.custom_error, PolicyEngineErrors::MinBalanceExceeded)?;
                            }
                        }
                    }
                }
                PolicyType::MinMaxBalance { min, max } => {
                    if self
                        .enforce_filters_single(
                            identity,
                            country,
                            &policy.identity_filter,
                        )
                        .is_ok()
                    {
                        if let Some(dst_tracker) = tracker_account {
                            if dst_tracker.total_amount > *max {
                                get_custom_error(policy.custom_error, PolicyEngineErrors::MaxBalanceExceeded)?;
                            }
                            if dst_tracker.total_amount < *min {
                                get_custom_error(policy.custom_error, PolicyEngineErrors::MinBalanceExceeded)?;
                            }
                        }
                    }
                }
                /* When the token is paused, issuance can still occur
                PolicyType::TransferPause => */
                PolicyType::ForbiddenIdentityGroup => {
                    if self
                        .enforce_filters_single(
                            identity,
                            country,
                            &policy.identity_filter,
                        )
                        .is_ok()
                    {
                        get_custom_error(policy.custom_error, PolicyEngineErrors::ForbiddenIdentityGroup)?;
                    }
                }
                _ => {}
            }
        }
        Ok(())
    }

    /// enforces different types of policies
    #[inline(never)]
    #[allow(clippy::too_many_arguments)]
    pub fn enforce_policy(
        &self,
        transfer_amount: u64,
        timestamp: i64,
        source_identity: &[IdentityLevel],
        source_country: u8,
        destination_identity: &[IdentityLevel],
        destination_country: u8,
        source_balance: u64,
        destination_balance: u64,
        self_transfer: bool,
        is_platform_wallet: bool,
    ) -> Result<()> {
        for policy in self.policies.iter() {
            match &policy.policy_type {
                PolicyType::IdentityApproval => {
                    if !self_transfer && self
                        .enforce_filters_on_transfer(
                            source_identity,
                            source_country,
                            destination_identity,
                            destination_country,
                            &policy.identity_filter,
                        )
                        .is_err()
                    {
                        get_custom_error(policy.custom_error, PolicyEngineErrors::IdentityFilterFailed)?;
                    }
                }
                PolicyType::TransactionAmountLimit { limit } => {
                    if self
                        .enforce_filters_on_transfer(
                            source_identity,
                            source_country,
                            destination_identity,
                            destination_country,
                            &policy.identity_filter,
                        )
                        .is_ok()
                        && transfer_amount > *limit
                    {
                        get_custom_error(policy.custom_error, PolicyEngineErrors::TransactionAmountLimitExceeded)?;
                    }
                }
                PolicyType::MaxBalance { limit } => {
                    if !self_transfer
                        && self
                            .enforce_filters_on_transfer(
                                source_identity,
                                source_country,
                                destination_identity,
                                destination_country,
                                &policy.identity_filter,
                            )
                            .is_ok()
                    {
                        if destination_balance > *limit {
                            get_custom_error(policy.custom_error, PolicyEngineErrors::MaxBalanceExceeded)?;
                        }
                    }
                }
                PolicyType::MinBalance { limit } => {
                    if !self_transfer && !is_platform_wallet {
                        if self
                            .enforce_filters_single(
                                source_identity,
                                source_country,
                                &policy.identity_filter,
                            )
                            .is_ok()
                        {
                            if source_balance < *limit {
                                get_custom_error(policy.custom_error, PolicyEngineErrors::MinBalanceExceeded)?;
                            }
                        }
                        if self
                            .enforce_filters_single(
                                destination_identity,
                                destination_country,
                                &policy.identity_filter,
                            )
                            .is_ok()
                        {
                            if destination_balance < *limit {
                                get_custom_error(policy.custom_error, PolicyEngineErrors::MinBalanceExceeded)?;
                            }
                        }
                    }
                }
                PolicyType::TransferPause => {
                    if self
                        .enforce_filters_on_transfer(
                            source_identity,
                            source_country,
                            destination_identity,
                            destination_country,
                            &policy.identity_filter,
                        )
                        .is_ok()
                    {
                        get_custom_error(policy.custom_error, PolicyEngineErrors::TransferPaused)?;
                    }
                }
                PolicyType::ForceFullTransfer => {
                    if !self_transfer && self
                        .enforce_filters_on_transfer(
                            source_identity,
                            source_country,
                            destination_identity,
                            destination_country,
                            &policy.identity_filter,
                        )
                        .is_ok()
                        && source_balance != 0
                    {
                        get_custom_error(policy.custom_error, PolicyEngineErrors::ForceFullTransfer)?;
                    }
                }
                PolicyType::ForbiddenIdentityGroup => {
                    if !self_transfer && self
                        .enforce_filters_on_transfer(
                            source_identity,
                            source_country,
                            destination_identity,
                            destination_country,
                            &policy.identity_filter,
                        )
                        .is_ok()
                    {
                        get_custom_error(policy.custom_error, PolicyEngineErrors::ForbiddenIdentityGroup)?;
                    }
                }
                PolicyType::MinMaxBalance { min, max } => {
                    if !self_transfer && self
                        .enforce_filters_on_transfer(
                            source_identity,
                            source_country,
                            destination_identity,
                            destination_country,
                            &policy.identity_filter,
                        )
                        .is_ok()
                    {
                        if source_balance < *min || destination_balance < *min {
                            get_custom_error(policy.custom_error, PolicyEngineErrors::MinBalanceExceeded)?;
                        }
                        if source_balance > *max || destination_balance > *max {
                            get_custom_error(policy.custom_error, PolicyEngineErrors::MaxBalanceExceeded)?;
                        }
                    }
                }
                PolicyType::BlockFlowbackEndTime { time } => {
                    if !is_platform_wallet && self
                        .enforce_filters_on_transfer(
                            source_identity,
                            source_country,
                            destination_identity,
                            destination_country,
                            &policy.identity_filter,
                        )
                        .is_ok()
                    {
                        if *time == 0 || *time > timestamp {
                            get_custom_error(policy.custom_error, PolicyEngineErrors::Flowback)?;
                        }
                    }
                }
            }
        }
        Ok(())
    }

    pub fn decrease_holders_count(
        &mut self,
        identity: &[IdentityLevel],
        country: u8,
    ) -> Result<Vec<u8>> {
        let mut changed_counters = Vec::new();
        for counter in self.counters.iter() {
            if self
                .enforce_filters_single(identity, country, &counter.identity_filter)
                .is_ok()
            {
                changed_counters.push(counter.id);
            }
        }

        for counter in self.counters.iter_mut() {
            if changed_counters.contains(&counter.id) {
                counter.value = counter.value.checked_sub(1).ok_or(PolicyEngineErrors::CounterUnderflow)?;
            }
        }

        Ok(changed_counters)
    }

    pub fn increase_holders_count(
        &mut self,
        identity: &[IdentityLevel],
        country: u8,
    ) -> Result<Vec<u8>> {
        let mut changed_counters = Vec::new();

        for counter in self.counters.iter() {
            if self
                .enforce_filters_single(identity, country, &counter.identity_filter)
                .is_ok()
            {
                changed_counters.push(counter.id);
            }
        }

        for counter in self.counters.iter_mut() {
            if changed_counters.contains(&counter.id) {
                counter.value = counter.value.checked_add(1).ok_or(PolicyEngineErrors::CounterOverflow)?;
            }
        }

        Ok(changed_counters)
    }

    pub fn enforce_counters_on_increment(&self, incremented_counters: &[u8]) -> Result<()> {
        for counter_limit in self.counter_limits.iter() {
            match counter_limit {
                CounterLimit::HoldersLimit {
                    max,
                    min: _,
                    counter_id,
                } => {
                    if incremented_counters.contains(&counter_id) {
                        let counter = self
                            .counters
                            .iter()
                            .find(|counter| counter.id == *counter_id)
                            .unwrap();
                        if *max < counter.value {
                            return Err(PolicyEngineErrors::HoldersLimitExceeded.into());
                        }
                    }
                }
                CounterLimit::GroupedHoldersLimit {
                    max,
                    min: _,
                    counters,
                } => {
                    if incremented_counters.iter().any(|id| counters.contains(id)) {
                        for counter_id in counters.iter() {
                            let counter = self
                                .counters
                                .iter()
                                .find(|counter| counter.id == *counter_id)
                                .unwrap();
                            if *max < counter.value {
                                return Err(PolicyEngineErrors::HoldersLimitExceeded.into());
                            }
                        }
                    }
                }
                CounterLimit::PercentageLimit {
                    higher_counter_id,
                    lower_counter_id,
                    min_percentage,
                    max_percentage,
                } => {
                    if incremented_counters.contains(&higher_counter_id)
                        || incremented_counters.contains(&lower_counter_id)
                    {
                        let higher_counter = self
                            .counters
                            .iter()
                            .find(|counter| counter.id == *higher_counter_id)
                            .unwrap()
                            .value;
                        let lower_counter = self
                            .counters
                            .iter()
                            .find(|counter| counter.id == *lower_counter_id)
                            .unwrap()
                            .value;

                        let percent = lower_counter * 100 / higher_counter;

                        if *max_percentage < 100 && percent > *max_percentage as u64 {
                            return Err(PolicyEngineErrors::PercentageLimitExceeded.into());
                        }
                        if *min_percentage > 0 && percent < *min_percentage as u64 {
                            return Err(PolicyEngineErrors::PercentageLimitExceeded.into());
                        }
                    }
                }
            }
        }

        Ok(())
    }

    pub fn enforce_counters_on_decrement(&self, decremented_counters: &[u8]) -> Result<()> {
        for counter_limit in self.counter_limits.iter() {
            match counter_limit {
                CounterLimit::HoldersLimit {
                    max: _,
                    min,
                    counter_id,
                } => {
                    if decremented_counters.contains(&counter_id) {
                        let counter = self
                            .counters
                            .iter()
                            .find(|counter| counter.id == *counter_id)
                            .unwrap();
                        if *min > counter.value {
                            return Err(PolicyEngineErrors::HoldersLimitExceeded.into());
                        }
                    }
                }
                CounterLimit::GroupedHoldersLimit {
                    max: _,
                    min,
                    counters,
                } => {
                    for counter_id in counters.iter() {
                        if decremented_counters.contains(counter_id) {
                            let counter = self
                                .counters
                                .iter()
                                .find(|counter| counter.id == *counter_id)
                                .unwrap();
                            if *min > counter.value {
                                return Err(PolicyEngineErrors::HoldersLimitExceeded.into());
                            }
                        }
                    }
                }
                CounterLimit::PercentageLimit {
                    higher_counter_id,
                    lower_counter_id,
                    min_percentage,
                    max_percentage,
                } => {
                    if decremented_counters.contains(&higher_counter_id)
                        || decremented_counters.contains(&lower_counter_id)
                    {
                        let higher_counter = self
                            .counters
                            .iter()
                            .find(|counter| counter.id == *higher_counter_id)
                            .unwrap()
                            .value;
                        let lower_counter = self
                            .counters
                            .iter()
                            .find(|counter| counter.id == *lower_counter_id)
                            .unwrap()
                            .value;

                        let percent = lower_counter * 100 / higher_counter;

                        if *max_percentage < 100 && percent > *max_percentage as u64 {
                            return Err(PolicyEngineErrors::PercentageLimitExceeded.into());
                        }
                        if *min_percentage > 0 && percent < *min_percentage as u64 {
                            return Err(PolicyEngineErrors::PercentageLimitExceeded.into());
                        }
                    }
                }
            }
        }

        Ok(())
    }

    pub fn update_counters_on_levels_change(
        &mut self,
        previous_levels: &[IdentityLevel],
        previous_country: u8,
        new_levels: &[IdentityLevel],
        new_country: u8,
    ) -> Result<()> {
        let mut incremented_counters = Vec::new();
        let mut decremented_counters = Vec::new();

        for counter in self.counters.iter() {
            let prev_match = self
                .enforce_filters_single(
                    previous_levels,
                    previous_country,
                    &counter.identity_filter,
                )
                .is_ok();

            let new_match = self
                .enforce_filters_single(new_levels, new_country, &counter.identity_filter)
                .is_ok();

            if prev_match && !new_match {
                decremented_counters.push(counter.id);
            } else if !prev_match && new_match {
                incremented_counters.push(counter.id);
            }
        }

        for counter in self.counters.iter_mut() {
            if incremented_counters.contains(&counter.id) {
                counter.value += 1;
            } else if decremented_counters.contains(&counter.id) {
                counter.value -= 1;
            }
        }

        self.enforce_counters_on_increment(&incremented_counters)?;
        self.enforce_counters_on_decrement(&decremented_counters)?;

        Ok(())
    }

    pub fn enforce_policy_on_levels_change(
        &self,
        new_levels: &[IdentityLevel],
        country: u8,
        timestamp: i64,
        balance: u64,
        enforce_limits: bool,
    ) -> Result<()> {
        for policy in self.policies.iter() {
            match &policy.policy_type {
                PolicyType::MinMaxBalance { min, max } => {
                    if enforce_limits
                        && self
                            .enforce_filters_single(
                                new_levels,
                                country,
                                &policy.identity_filter,
                            )
                            .is_ok()
                    {
                        if balance < *min  {
                            return Err(PolicyEngineErrors::MinBalanceExceeded.into());
                        } else if balance > *max {
                            return Err(PolicyEngineErrors::MaxBalanceExceeded.into());
                        }
                    }
                }
                PolicyType::MaxBalance { limit } => {
                    if enforce_limits
                        && self
                            .enforce_filters_single(
                                new_levels,
                                country,
                                &policy.identity_filter,
                            )
                            .is_ok()
                    {
                        if balance > *limit {
                            return Err(PolicyEngineErrors::MaxBalanceExceeded.into());
                        }
                    }
                }
                PolicyType::MinBalance { limit } => {
                    if enforce_limits
                        && self
                            .enforce_filters_single(
                                new_levels,
                                country,
                                &policy.identity_filter,
                            )
                            .is_ok()
                    {
                        if balance < *limit {
                            return Err(PolicyEngineErrors::MinBalanceExceeded.into());
                        }
                    }
                }
                _ => {}
            }
        }
        Ok(())
    }

    pub fn update_and_enforce_policy_and_counters_on_levels_change(
        &mut self,
        previous_levels: &[IdentityLevel],
        new_levels: &[IdentityLevel],
        previous_country: u8,
        new_country: u8,
        timestamp: i64,
        balance: u64,
        enforce_limits: bool,
    ) -> Result<()> {
        self.update_counters_on_levels_change(
            previous_levels,
            previous_country,
            new_levels,
            new_country,
        )?;
        self.enforce_policy_on_levels_change(
            new_levels,
            new_country,
            timestamp,
            balance,
            enforce_limits,
        )
    }

    pub fn update_counters(
        &mut self,
        removed_counters: Vec<u8>,
        added_counters: Vec<Counter>,
    ) -> Result<i32> {

        let mut space: i32 = 0;

        for removed_counter in removed_counters.iter() {
            let pos = self.counters.iter().position(|c| c.id == *removed_counter)
                .ok_or(PolicyEngineErrors::CounterIdNotFound)?;
            space -= self.counters.remove(pos).get_space() as i32;
        }

        for added_counter in added_counters {
            if self.counters.iter().any(|c| c.id == added_counter.id) {
                return Err(PolicyEngineErrors::CounterIdAlreadyExists.into());
            }
            space += added_counter.get_space() as i32;
            self.counters.push(added_counter);
        }

        Ok(space)
    }

    pub fn update_counter_limits(
        &mut self,
        removed_counter_limits: Vec<u8>,
        added_counter_limits: Vec<CounterLimit>,
    ) -> Result<i32> {
        let mut space: i32 = -removed_counter_limits
            .iter()
            .rev()
            .map(|id| self.counter_limits.remove(*id as usize).get_space() as i32)
            .sum::<i32>();

        space += added_counter_limits
            .iter()
            .map(|limit| limit.get_space() as i32)
            .sum::<i32>();

        self.counter_limits.extend(added_counter_limits);

        Ok(space)
    }

    fn match_data(
        &self,
        identity: &[IdentityLevel],
        country: u8,
        filter: &FilterData,
    ) -> Result<()> {
        match filter.level {
            FilterLevel::Level(level) => {
                let id = identity.iter().find(|identity| identity.level == level);
                if filter.mode == FilterMode::Include
                    && id.is_some()
                {
                    return Ok(());
                } else if filter.mode == FilterMode::Exclude
                    && id.is_some()
                {
                    return Err(PolicyEngineErrors::IdentityFilterFailed.into());
                } else if filter.mode == FilterMode::Exclude {
                    return Ok(());
                }
                Err(PolicyEngineErrors::IdentityFilterFailed.into())
            }
            FilterLevel::Country(c) => {
                if (filter.mode == FilterMode::Include && country == c)
                    || (filter.mode == FilterMode::Exclude && country != c)
                {
                    return Ok(());
                } else {
                    return Err(PolicyEngineErrors::IdentityFilterFailed.into());
                }
            }
            FilterLevel::LevelMapping { source, target } => {
                let mapping = self.mapping[source as usize];
                if mapping == target {
                    let id = identity.iter().find(|identity| identity.level == source);
                    if filter.mode == FilterMode::Include
                        && id.is_some()
                    {
                        return Ok(());
                    } else if filter.mode == FilterMode::Exclude
                        && id.is_some()
                    {
                        return Err(PolicyEngineErrors::IdentityFilterFailed.into());
                    } else if filter.mode == FilterMode::Exclude {
                        return Ok(());
                    }
                }
                Err(PolicyEngineErrors::IdentityFilterFailed.into())
            }
            FilterLevel::CountryMapping(target) => {
                if (filter.mode == FilterMode::Include && self.mapping[country as usize] == target)
                    || (filter.mode == FilterMode::Exclude
                        && self.mapping[country as usize] != target)
                {
                    return Ok(());
                } else {
                    return Err(PolicyEngineErrors::IdentityFilterFailed.into());
                }
            }
            FilterLevel::LevelMappingAny(target) => {
                let id = identity
                    .iter()
                    .find(|identity| self.mapping[identity.level as usize] == target);
                if filter.mode == FilterMode::Include
                    && id.is_some()
                {
                    return Ok(());
                } else if filter.mode == FilterMode::Exclude
                    && id.is_some()
                {
                    return Err(PolicyEngineErrors::IdentityFilterFailed.into());
                } else if filter.mode == FilterMode::Exclude {
                    return Ok(());
                }
                Err(PolicyEngineErrors::IdentityFilterFailed.into())
            }
        }
    }

    fn match_filter_data_and_target(
        &self,
        identity_sender: &[IdentityLevel],
        country_sender: u8,
        identity_receiver: &[IdentityLevel],
        country_receiver: u8,
        filter: &FilterData,
    ) -> Result<()> {
        match filter.target {
            FilterTarget::Sender => {
                self.match_data(identity_sender, country_sender, filter)
            }
            FilterTarget::Receiver => {
                self.match_data(identity_receiver, country_receiver, filter)
            }
            FilterTarget::BothAnd => self
                .match_data(identity_sender, country_sender, filter)
                .and_then(|_| {
                    self.match_data(identity_receiver, country_receiver, filter)
                }),
            FilterTarget::BothOr => self
                .match_data(identity_sender, country_sender, filter)
                .or_else(|_| {
                    self.match_data(identity_receiver, country_receiver, filter)
                }),
        }
    }

    fn enforce_filters_on_transfer(
        &self,
        identity_sender: &[IdentityLevel],
        country_sender: u8,
        identity_receiver: &[IdentityLevel],
        country_receiver: u8,
        filter: &IdentityFilter,
    ) -> Result<()> {
        match filter {
            IdentityFilter::Simple(filter) => self.enforce_inner_filter(
                identity_sender,
                country_sender,
                identity_receiver,
                country_receiver,
                filter,
            ),
            IdentityFilter::IfThen(filter, then_filter) => {
                if self
                    .enforce_inner_filter(
                        identity_sender,
                        country_sender,
                        identity_receiver,
                        country_receiver,
                        filter,
                    )
                    .is_ok()
                {
                    self.enforce_inner_filter(
                        identity_sender,
                        country_sender,
                        identity_receiver,
                        country_receiver,
                        then_filter,
                    )
                } else {
                    Ok(())
                }
            }
        }
    }

    fn enforce_filters_single(
        &self,
        identity: &[IdentityLevel],
        country: u8,
        filter: &IdentityFilter,
    ) -> Result<()> {
        match filter {
            IdentityFilter::Simple(filter) => {
                self.enforce_inner_filter(identity, country, identity, country, filter)
            }
            IdentityFilter::IfThen(filter, then_filter) => {
                if self
                    .enforce_inner_filter(identity, country, identity, country, filter)
                    .is_ok()
                {
                    self.enforce_inner_filter(
                        identity,
                        country,
                        identity,
                        country,
                        then_filter,
                    )
                } else {
                    Ok(())
                }
            }
        }
    }

    fn enforce_inner_filter(
        &self,
        identity_sender: &[IdentityLevel],
        country_sender: u8,
        identity_receiver: &[IdentityLevel],
        country_receiver: u8,
        filter: &FilterInner,
    ) -> Result<()> {
        match filter {
            FilterInner::Single(filter) => self.match_filter_data_and_target(
                identity_sender,
                country_sender,
                identity_receiver,
                country_receiver,
                filter,
            ),
            FilterInner::Tuple(filter, FilterComparison::And, then_filter) => self
                .match_filter_data_and_target(
                    identity_sender,
                    country_sender,
                    identity_receiver,
                    country_receiver,
                    filter,
                )
                .and_then(|_| {
                    self.match_filter_data_and_target(
                        identity_sender,
                        country_sender,
                        identity_receiver,
                        country_receiver,
                        then_filter,
                    )
                }),
            FilterInner::Tuple(filter, FilterComparison::Or, then_filter) => self
                .match_filter_data_and_target(
                    identity_sender,
                    country_sender,
                    identity_receiver,
                    country_receiver,
                    filter,
                )
                .or_else(|_| {
                    self.match_filter_data_and_target(
                        identity_sender,
                        country_sender,
                        identity_receiver,
                        country_receiver,
                        then_filter,
                    )
                }),
            FilterInner::Multiple(FilterComparison::And, filters) => {
                let mut result = Ok(());
                for filter in filters.iter() {
                    result = result.and_then(|_| {
                        self.match_filter_data_and_target(
                            identity_sender,
                            country_sender,
                            identity_receiver,
                            country_receiver,
                            filter,
                        )
                    });
                    if result.is_err() {
                        return result;
                    }
                }
                result
            }
            FilterInner::Multiple(FilterComparison::Or, filters) => {
                let mut result = Err(PolicyEngineErrors::IdentityFilterFailed.into());
                for filter in filters.iter() {
                    result = result.or_else(|_| {
                        self.match_filter_data_and_target(
                            identity_sender,
                            country_sender,
                            identity_receiver,
                            country_receiver,
                            filter,
                        )
                    });
                    if result.is_ok() {
                        return result;
                    }
                }
                result
            }
        }
    }

    pub fn set_counters(&mut self, changed_counters: Vec<u8>, values: Vec<u64>) -> Result<()> {
        for (i, counter_id) in changed_counters.iter().enumerate() {
            let counter = self
                .counters
                .iter_mut()
                .find(|counter| counter.id == *counter_id)
                .ok_or(PolicyEngineErrors::CounterNotFound)?;
            if counter.value != values[i] {
                counter.value = values[i];
            }
        }
        Ok(())
    }
}

/// bec of circular dependancy acp's pubkey is hardcoded
pub fn get_asset_controller_account_pda(asset_mint: Pubkey) -> Pubkey {
    Pubkey::find_program_address(
        &[asset_mint.as_ref()],
        &pubkey!("7tXjmbkZVY3Gmg9kDBebcNXT1yC5pyoxxXVLwdbv9tvP"),
    )
    .0
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn issuance_policies_accept_nonnegative_periods() {
        for (us_lock_period, non_us_lock_period) in
            [(0, 0), (0, 100), (100, 0), (100, 200), (i64::MAX, i64::MAX)]
        {
            let mut policy = PolicyEngineAccount::new(Pubkey::default(), Pubkey::default());
            policy
                .change_issuance_policies(IssuancePolicies {
                    disallow_backdating: true,
                    max_supply: 123,
                    us_lock_period,
                    non_us_lock_period,
                })
                .unwrap();

            assert_eq!(policy.issuance_policies.us_lock_period, us_lock_period);
            assert_eq!(
                policy.issuance_policies.non_us_lock_period,
                non_us_lock_period
            );
            assert!(policy.issuance_policies.disallow_backdating);
            assert_eq!(policy.issuance_policies.max_supply, 123);
        }
    }

    #[test]
    fn invalid_issuance_periods_are_rejected_without_mutating_policy_state() {
        let mut policy = PolicyEngineAccount::new(Pubkey::default(), Pubkey::default());
        let before = policy.try_to_vec().unwrap();
        for (us_lock_period, non_us_lock_period) in
            [(-1, 0), (0, -1), (i64::MIN, 1), (1, i64::MIN), (-1, -1)]
        {
            let error = policy
                .change_issuance_policies(IssuancePolicies {
                    disallow_backdating: true,
                    max_supply: 123,
                    us_lock_period,
                    non_us_lock_period,
                })
                .unwrap_err();

            assert_eq!(error, error!(PolicyEngineErrors::InvalidLockPeriod));
            assert_eq!(policy.try_to_vec().unwrap(), before);
        }
    }
}

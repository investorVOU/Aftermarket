use near_sdk::collections::LookupMap;
use near_sdk::json_types::U128;
use near_sdk::serde::{Deserialize, Serialize};
use near_sdk::serde_json::{self, json};
use near_sdk::{env, near, AccountId, Gas, NearToken, PanicOnDefault, Promise, PromiseResult};

const ITEMS: [&str; 8] = [
    "cash",
    "timber",
    "furniture",
    "ore",
    "gold",
    "maize",
    "cassava",
    "milk",
];

#[derive(Serialize, Deserialize)]
#[serde(crate = "near_sdk::serde")]
pub struct Change {
    pub account_id: AccountId,
    pub token_id: String,
    pub delta: String,
}

#[near(contract_state)]
#[derive(PanicOnDefault)]
pub struct Economy {
    controller: AccountId,
    balances: LookupMap<String, u128>,
    supplies: LookupMap<String, u128>,
    registered: LookupMap<AccountId, bool>,
    storage_deposits: LookupMap<AccountId, u128>,
    wallet_world: LookupMap<AccountId, String>,
    revisions: LookupMap<String, u64>,
    licences: LookupMap<String, AccountId>,
}

#[near]
impl Economy {
    #[init]
    pub fn new(controller: AccountId) -> Self {
        Self {
            controller,
            balances: LookupMap::new(b"b"),
            supplies: LookupMap::new(b"s"),
            registered: LookupMap::new(b"a"),
            storage_deposits: LookupMap::new(b"d"),
            wallet_world: LookupMap::new(b"w"),
            revisions: LookupMap::new(b"r"),
            licences: LookupMap::new(b"l"),
        }
    }

    pub fn controller(&self) -> AccountId {
        self.controller.clone()
    }
    pub fn world_revision(&self, world_id: String) -> u64 {
        self.revisions.get(&world_id).unwrap_or(0)
    }
    pub fn business_owner(&self, world_id: String) -> Option<AccountId> {
        self.licences.get(&world_id)
    }

    // The game controller sponsors storage and settles validated game outcomes.
    // This is a permissioned game economy; the controller is a disclosed trust boundary.
    #[payable]
    pub fn settle_world(
        &mut self,
        world_id: String,
        revision: u64,
        changes: Vec<Change>,
        licence_owner: Option<AccountId>,
    ) -> bool {
        assert_eq!(
            env::predecessor_account_id(),
            self.controller,
            "Controller only"
        );
        assert!(
            !world_id.is_empty() && world_id.len() <= 64,
            "Invalid world"
        );
        assert!(changes.len() <= 100, "Checkpoint too large");
        let before = env::storage_usage();
        if revision <= self.revisions.get(&world_id).unwrap_or(0) {
            self.refund_storage(before);
            return false;
        }
        for change in changes {
            assert!(ITEMS.contains(&change.token_id.as_str()), "Unknown item");
            if let Some(assigned) = self.wallet_world.get(&change.account_id) {
                assert_eq!(assigned, world_id, "Wallet belongs to another world");
            } else {
                self.wallet_world.insert(&change.account_id, &world_id);
                self.register(&change.account_id);
            }
            let delta: i128 = change.delta.parse().expect("Invalid delta");
            if delta == 0 {
                continue;
            }
            let old = self.balance(&change.account_id, &change.token_id);
            let supply = self.supplies.get(&change.token_id).unwrap_or(0);
            let amount = delta.unsigned_abs();
            let (new, total, event) = if delta > 0 {
                (
                    old.checked_add(amount).expect("Balance overflow"),
                    supply.checked_add(amount).expect("Supply overflow"),
                    "mt_mint",
                )
            } else {
                (
                    old.checked_sub(amount)
                        .expect("Insufficient on-chain items"),
                    supply.checked_sub(amount).expect("Supply underflow"),
                    "mt_burn",
                )
            };
            self.set_balance(&change.account_id, &change.token_id, new);
            self.supplies.insert(&change.token_id, &total);
            Self::event(
                event,
                json!({"owner_id":change.account_id,"token_ids":[change.token_id],"amounts":[amount.to_string()],"memo":"Validated game checkpoint"}),
            );
        }
        if let Some(owner) = licence_owner {
            assert_eq!(
                self.wallet_world.get(&owner),
                Some(world_id.clone()),
                "Owner must belong to world"
            );
            if let Some(existing) = self.licences.get(&world_id) {
                assert_eq!(existing, owner, "Licence already issued");
            } else {
                let token = format!("trading-post:{}", world_id);
                self.licences.insert(&world_id, &owner);
                self.set_balance(&owner, &token, 1);
                self.supplies.insert(&token, &1);
                Self::event(
                    "mt_mint",
                    json!({"owner_id":owner,"token_ids":[token],"amounts":["1"]}),
                );
            }
        }
        self.revisions.insert(&world_id, &revision);
        env::log_str(&format!(
            "EVENT_JSON:{}",
            json!({"standard":"aftermarket","version":"1.0.0","event":"checkpoint","data":[{"world_id":world_id,"revision":revision}]})
        ));
        self.refund_storage(before);
        true
    }

    pub fn mt_token(&self, token_ids: Vec<String>) -> Vec<Option<serde_json::Value>> {
        token_ids.into_iter().map(|id| self.supplies.get(&id).map(|_|json!({"token_id":id,"owner_id":null,"base_metadata_id":id,"token_metadata":Self::token_metadata(&id)}))).collect()
    }
    pub fn mt_metadata_contract(&self) -> serde_json::Value {
        json!({"spec":"mt-1.0.0","name":"AFTERMARKET island items"})
    }
    pub fn mt_metadata_token_all(&self, token_ids: Vec<String>) -> Vec<serde_json::Value> {
        token_ids
            .iter()
            .map(|id| json!({"base":Self::base_metadata(id),"token":Self::token_metadata(id)}))
            .collect()
    }
    pub fn mt_metadata_token_by_token_id(&self, token_ids: Vec<String>) -> Vec<serde_json::Value> {
        token_ids
            .iter()
            .map(|id| Self::token_metadata(id))
            .collect()
    }
    pub fn mt_metadata_base_by_token_id(&self, token_ids: Vec<String>) -> Vec<serde_json::Value> {
        token_ids.iter().map(|id| Self::base_metadata(id)).collect()
    }
    pub fn mt_metadata_base_by_metadata_id(
        &self,
        base_metadata_ids: Vec<String>,
    ) -> Vec<serde_json::Value> {
        base_metadata_ids
            .iter()
            .map(|id| Self::base_metadata(id))
            .collect()
    }
    pub fn mt_balance_of(&self, account_id: AccountId, token_id: String) -> U128 {
        U128(self.balance(&account_id, &token_id))
    }
    pub fn mt_batch_balance_of(&self, account_id: AccountId, token_ids: Vec<String>) -> Vec<U128> {
        token_ids
            .iter()
            .map(|t| U128(self.balance(&account_id, t)))
            .collect()
    }
    pub fn mt_supply(&self, token_id: String) -> Option<U128> {
        self.supplies.get(&token_id).map(U128)
    }
    pub fn mt_batch_supply(&self, token_ids: Vec<String>) -> Vec<Option<U128>> {
        token_ids.into_iter().map(|t| self.mt_supply(t)).collect()
    }

    #[payable]
    pub fn storage_deposit(&mut self, account_id: Option<AccountId>) -> serde_json::Value {
        let before = env::storage_usage();
        let id = account_id.unwrap_or_else(env::predecessor_account_id);
        self.register(&id);
        let cost = self.storage_deposits.get(&id).unwrap_or(0);
        self.refund_storage(before);
        json!({"total":cost.to_string(),"available":"0"})
    }
    pub fn storage_balance_of(&self, account_id: AccountId) -> Option<serde_json::Value> {
        self.storage_deposits
            .get(&account_id)
            .map(|total| json!({"total":total.to_string(),"available":"0"}))
    }

    #[payable]
    pub fn mt_transfer(
        &mut self,
        receiver_id: AccountId,
        token_id: String,
        amount: U128,
        approval: Option<(AccountId, u64)>,
        memo: Option<String>,
    ) {
        Self::one_yocto();
        assert!(approval.is_none(), "Approvals extension not supported");
        self.transfer(
            &env::predecessor_account_id(),
            &receiver_id,
            &[token_id],
            &[amount],
            memo,
        );
    }
    #[payable]
    pub fn mt_batch_transfer(
        &mut self,
        receiver_id: AccountId,
        token_ids: Vec<String>,
        amounts: Vec<U128>,
        approvals: Option<Vec<Option<(AccountId, u64)>>>,
        memo: Option<String>,
    ) {
        Self::one_yocto();
        assert!(approvals.is_none(), "Approvals extension not supported");
        self.transfer(
            &env::predecessor_account_id(),
            &receiver_id,
            &token_ids,
            &amounts,
            memo,
        );
    }
    #[payable]
    pub fn mt_transfer_call(
        &mut self,
        receiver_id: AccountId,
        token_id: String,
        amount: U128,
        approval: Option<(AccountId, u64)>,
        memo: Option<String>,
        msg: String,
    ) -> Promise {
        Self::one_yocto();
        assert!(approval.is_none(), "Approvals extension not supported");
        self.transfer_call(receiver_id, vec![token_id], vec![amount], memo, msg)
    }
    #[payable]
    pub fn mt_batch_transfer_call(
        &mut self,
        receiver_id: AccountId,
        token_ids: Vec<String>,
        amounts: Vec<U128>,
        approvals: Option<Vec<Option<(AccountId, u64)>>>,
        memo: Option<String>,
        msg: String,
    ) -> Promise {
        Self::one_yocto();
        assert!(approvals.is_none(), "Approvals extension not supported");
        self.transfer_call(receiver_id, token_ids, amounts, memo, msg)
    }
    #[private]
    pub fn mt_resolve_transfer(
        &mut self,
        sender_id: AccountId,
        receiver_id: AccountId,
        token_ids: Vec<String>,
        amounts: Vec<U128>,
    ) -> Vec<U128> {
        let unused = match env::promise_result(0) {
            PromiseResult::Successful(bytes) => serde_json::from_slice::<Vec<U128>>(&bytes)
                .ok()
                .filter(|v| v.len() == amounts.len())
                .unwrap_or_else(|| amounts.clone()),
            _ => amounts.clone(),
        };
        token_ids
            .iter()
            .zip(amounts.iter().zip(unused.iter()))
            .map(|(token, (sent, unused))| {
                let refund = unused.0.min(sent.0).min(self.balance(&receiver_id, token));
                if refund > 0 {
                    self.transfer(
                        &receiver_id,
                        &sender_id,
                        &[token.clone()],
                        &[U128(refund)],
                        Some("Unused transfer refund".into()),
                    );
                }
                U128(sent.0 - refund)
            })
            .collect()
    }
}

impl Economy {
    fn base_metadata(id: &str) -> serde_json::Value {
        json!({"id":id,"name":if id.starts_with("trading-post:"){ "Trading Post business licence" }else{id},"symbol":id.to_uppercase(),"icon":null,"decimals":if id=="cash"{"2"}else if id=="gold"{"3"}else{"0"},"base_uri":null,"reference":null,"copies":null,"reference_hash":null})
    }
    fn token_metadata(id: &str) -> serde_json::Value {
        json!({"title":id,"description":if id=="cash"{"AFTERMARKET game credit. Not native NEAR, a stablecoin, or a redeemable cash claim."}else{"An item in the AFTERMARKET permissioned game economy."},"media":null,"media_hash":null,"issued_at":null,"expires_at":null,"starts_at":null,"updated_at":null,"extra":null,"reference":null,"reference_hash":null})
    }
    fn key(account: &AccountId, token: &str) -> String {
        format!("{}:{}", account, token)
    }
    fn balance(&self, account: &AccountId, token: &str) -> u128 {
        self.balances.get(&Self::key(account, token)).unwrap_or(0)
    }
    fn set_balance(&mut self, account: &AccountId, token: &str, value: u128) {
        self.balances.insert(&Self::key(account, token), &value);
    }
    fn register(&mut self, id: &AccountId) {
        if self.registered.get(id).is_none() {
            let before = env::storage_usage();
            self.registered.insert(id, &true);
            for token in ITEMS {
                self.set_balance(id, token, 0);
            }
            self.storage_deposits.insert(id, &0);
            let cost = env::storage_usage().saturating_sub(before) as u128
                * env::storage_byte_cost().as_yoctonear();
            self.storage_deposits.insert(id, &cost);
        }
    }
    fn event(event: &str, data: serde_json::Value) {
        env::log_str(&format!(
            "EVENT_JSON:{}",
            json!({"standard":"nep245","version":"1.0.0","event":event,"data":[data]})
        ));
    }
    fn one_yocto() {
        assert_eq!(
            env::attached_deposit(),
            NearToken::from_yoctonear(1),
            "Attach exactly 1 yoctoNEAR"
        );
    }
    fn refund_storage(&self, before: u64) {
        let cost = env::storage_usage().saturating_sub(before) as u128
            * env::storage_byte_cost().as_yoctonear();
        let paid = env::attached_deposit().as_yoctonear();
        assert!(paid >= cost, "Attach more NEAR for storage");
        if paid > cost {
            let _ = Promise::new(env::predecessor_account_id())
                .transfer(NearToken::from_yoctonear(paid - cost));
        }
    }
    fn transfer(
        &mut self,
        sender: &AccountId,
        receiver: &AccountId,
        tokens: &[String],
        amounts: &[U128],
        memo: Option<String>,
    ) {
        assert_ne!(sender, receiver, "Self transfer");
        assert!(
            self.registered.get(receiver).is_some(),
            "Receiver must register storage first"
        );
        assert!(
            !tokens.is_empty() && tokens.len() <= 50 && tokens.len() == amounts.len(),
            "Invalid batch"
        );
        for (token, amount) in tokens.iter().zip(amounts) {
            assert!(amount.0 > 0, "Zero transfer");
            assert!(
                !token.starts_with("trading-post:"),
                "Business licences are bound to their game world"
            );
            let from = self
                .balance(sender, token)
                .checked_sub(amount.0)
                .expect("Insufficient balance");
            let to = self
                .balance(receiver, token)
                .checked_add(amount.0)
                .expect("Balance overflow");
            self.set_balance(sender, token, from);
            self.set_balance(receiver, token, to);
        }
        Self::event(
            "mt_transfer",
            json!({"old_owner_id":sender,"new_owner_id":receiver,"token_ids":tokens,"amounts":amounts,"memo":memo}),
        );
    }
    fn transfer_call(
        &mut self,
        receiver: AccountId,
        tokens: Vec<String>,
        amounts: Vec<U128>,
        memo: Option<String>,
        msg: String,
    ) -> Promise {
        assert!(
            env::prepaid_gas().as_gas() >= Gas::from_tgas(80).as_gas(),
            "Attach at least 80 Tgas"
        );
        let sender = env::predecessor_account_id();
        self.transfer(&sender, &receiver, &tokens, &amounts, memo);
        Promise::new(receiver.clone()).function_call("mt_on_transfer".into(),serde_json::to_vec(&json!({"sender_id":sender,"previous_owner_ids":vec![sender.clone();tokens.len()],"token_ids":tokens,"amounts":amounts,"msg":msg})).unwrap(),NearToken::from_yoctonear(0),Gas::from_tgas(35))
        .then(Promise::new(env::current_account_id()).function_call("mt_resolve_transfer".into(),serde_json::to_vec(&json!({"sender_id":sender,"receiver_id":receiver,"token_ids":tokens,"amounts":amounts})).unwrap(),NearToken::from_yoctonear(0),Gas::from_tgas(25)))
    }
}

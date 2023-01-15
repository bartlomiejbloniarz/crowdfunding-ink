#![cfg_attr(not(feature = "std"), no_std)]

use ink_lang as ink;


#[ink::contract]
mod crowdfund {


    use ink_env::{transferred_value, caller, transfer};
    use ink_storage::{traits::SpreadAllocate, Mapping};

    #[ink(storage)]
    #[derive(SpreadAllocate)]
    pub struct Crowdfund {
        deposits: Mapping<AccountId, u128>
    }

    use ink_lang::utils::initialize_contract;
    impl Crowdfund {

        #[ink(constructor)]
        pub fn new() -> Self {
            initialize_contract(|_: &mut Self| {})
        }

        #[ink(message)]
        pub fn get_deposited_amount(&self, account: AccountId) -> u128 {
            match self.deposits.get(account) {
                Some(value) => value,
                None => 0
            }
        }

        #[ink(message, payable)]
        pub fn make_deposit(&mut self) {
            let amount = transferred_value::<Environment>();
            let caller = caller::<Environment>();
            let deposited_amount = self.get_deposited_amount(caller);

            self.deposits.insert(caller, &(deposited_amount + amount));
        }

        #[ink(message)]
        pub fn claim(&mut self, amount: u128) -> bool { // amount is in the lowest acceptable fraction of TZERO
            let caller = caller::<Environment>();
            let deposited_amount = self.get_deposited_amount(caller);
            
            if amount > deposited_amount {
                return false;
            }

            self.deposits.insert(caller, &(deposited_amount - amount));
            match transfer::<Environment>(caller, amount) {
                Ok(_)=> return true,
                Err(_) => return false,
            };
        }
    }

    #[cfg(test)]
    mod tests {}
}

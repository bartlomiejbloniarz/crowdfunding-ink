#![cfg_attr(not(feature = "std"), no_std)]

use ink_lang as ink;


#[ink::contract]
mod crowdfund {

    use ink_env::{transferred_value, caller, transfer, block_timestamp, Environment};
    use ink_storage::{traits::{SpreadAllocate}, Mapping};

    #[derive(ink_storage::traits::PackedLayout, ink_storage::traits::SpreadLayout, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(::scale_info::TypeInfo))]
    pub struct ProjectInfo{ // should never get modified
        description: String,
        author: AccountId,
        create_time: Timestamp,
        deadline: Timestamp,
        goal: u128,
    }

    #[ink(storage)]
    #[derive(SpreadAllocate)]
    pub struct Crowdfund {
        projects: Mapping<String, ProjectInfo>,         // project --> static info about it
        donations: Mapping<(String, AccountId), u128>,  // project, account --> donated amount
        budgets: Mapping<String, u128>,                 // project --> overall collected budget
    }

    use ink_lang::utils::initialize_contract;
    impl Crowdfund {

        #[ink(constructor)]
        pub fn new() -> Self {
            initialize_contract(|_: &mut Self| {})
        }

        #[ink(message)]
        pub fn create_project(&mut self, project_name: String, description: String, deadline: Timestamp, goal: u128) {
            assert!(!self.projects.contains(project_name), "Such project already exists.");
            let author = caller::<Environment>();
            let create_time = block_timestamp::<Environment>();

            let info = ProjectInfo {
                description,
                author,
                create_time,
                deadline,
                goal,
            };

            self.projects.insert(project_name, &info);
            self.budgets.insert(project_name, &0);
        }

        #[ink(message)]
        pub fn get_donated_amount(&self, project_name: String, account: AccountId) -> u128 {
            assert!(self.projects.contains(&project_name), "Such project doesn't exist.");
            match self.donations.get((project_name, account)) {
                Some(value) => value,
                None => 0,
            }
        }

        #[ink(message)]
        pub fn get_collected_budget(&self, project_name: String) -> u128 {
            match self.budgets.get(project_name) {
                Some(value) => value,
                None => panic!("Such project doesn't exist.")
            }
        }

        #[ink(message)]
        pub fn get_project_info(&self, project_name: String) -> ProjectInfo {
            match self.projects.get(project_name) {
                Some(value) => value,
                None => panic!("Such project doesn't exist."),
            }
        }

        #[ink(message, payable)]
        pub fn make_donation(&mut self, project_name: String) {
            let info = self.get_project_info(project_name.clone()); // also checks if project exists
            let current_time = block_timestamp::<Environment>();
            assert!(current_time < info.deadline, "The project's deadline has passed. Not possible to contribute.");

            let donor = caller::<Environment>();
            let donated = self.get_donated_amount(project_name.clone(), donor);
            let value = transferred_value::<Environment>();
            let budget = self.get_collected_budget(project_name.clone());

            self.donations.insert((project_name.clone(), donor), &(donated + value));
            self.budgets.insert(project_name, &(budget + value));
        }

        #[ink(message)]
        pub fn refund_donation(&mut self, project_name: String) {
            let info = self.get_project_info(project_name.clone()); // also checks if project exists
            let current_time = block_timestamp::<Environment>();
            assert!(current_time >= info.deadline, "The project's deadline hasn't passed. Not possible to refund.");

            let donor = caller::<Environment>();
            let donated = self.get_donated_amount(project_name.clone(), donor);
            let budget = self.get_collected_budget(project_name.clone());
            assert!(donated > 0, "No funds to return.");

            self.donations.insert((project_name.clone(), donor), &0);
            self.budgets.insert(project_name, &(budget - donated));

            transfer::<Environment>(donor, donated).expect("Transfer failed.");
        }

        #[ink(message)]
        pub fn claim_budget(&mut self, project_name: String) {
            let info = self.get_project_info(project_name.clone()); // also checks if project exists
            let current_time = block_timestamp::<Environment>();
            assert!(current_time >= info.deadline, "The project's deadline hasn't passed. Not possible to claim budget.");

            let author = caller::<Environment>();
            assert!(author == info.author, "You are not the author of this project. Not possible to claim budget.");

            let budget = self.get_collected_budget(project_name.clone());
            assert!(budget > 0, "No funds to claim.");

            self.budgets.insert(project_name, &0);
            
            transfer::<Environment>(author, budget).expect("Transfer failed.");
        }
    }

    #[cfg(test)]
    mod tests {
        use crate::crowdfund::Crowdfund;
        use ink_env::{test, DefaultEnvironment};
        use ink_lang as ink;

       
    }
}

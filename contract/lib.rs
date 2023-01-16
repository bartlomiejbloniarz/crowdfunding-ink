#![cfg_attr(not(feature = "std"), no_std)]

use ink_lang as ink;

#[ink::contract]
mod crowdfund {
    use ink_prelude::string::String;
    use ink_env::{block_timestamp, caller, transfer, transferred_value};
    use ink_storage::{traits::SpreadAllocate, Mapping};

    #[derive(
        ink_storage::traits::PackedLayout,
        ink_storage::traits::SpreadLayout,
        scale::Encode,
        scale::Decode,
    )]
    #[cfg_attr(feature = "std", derive(::scale_info::TypeInfo, Debug, PartialEq))]
    pub struct ProjectInfo {
        // should never get modified
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
            assert!(
                !self.projects.contains(project_name.clone()),
                "Such project already exists."
            );
            let author = caller::<Environment>();
            let create_time = block_timestamp::<Environment>();

            let info = ProjectInfo {
                description,
                author,
                create_time,
                deadline,
                goal,
            };

            self.projects.insert(project_name.clone(), &info);
            self.budgets.insert(project_name, &0);
        }

        #[ink(message)]
        pub fn get_donated_amount(&self, project_name: String, account: AccountId) -> u128 {
            assert!(
                self.projects.contains(&project_name),
                "Such project doesn't exist."
            );
            match self.donations.get((project_name, account)) {
                Some(value) => value,
                None => 0,
            }
        }

        #[ink(message)]
        pub fn get_collected_budget(&self, project_name: String) -> u128 {
            match self.budgets.get(project_name) {
                Some(value) => value,
                None => panic!("Such project doesn't exist."),
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
            assert!(
                current_time < info.deadline,
                "The project's deadline has passed. Not possible to contribute."
            );

            let donor = caller::<Environment>();
            let donated = self.get_donated_amount(project_name.clone(), donor);
            let value = transferred_value::<Environment>();
            let budget = self.get_collected_budget(project_name.clone());

            self.donations
                .insert((project_name.clone(), donor), &(donated + value));
            self.budgets.insert(project_name, &(budget + value));
        }

        #[ink(message)]
        pub fn refund_donation(&mut self, project_name: String) {
            let info = self.get_project_info(project_name.clone()); // also checks if project exists
            let current_time = block_timestamp::<Environment>();
            assert!(
                current_time >= info.deadline,
                "The project's deadline hasn't passed. Not possible to refund."
            );

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
            assert!(
                current_time >= info.deadline,
                "The project's deadline hasn't passed. Not possible to claim budget."
            );

            let author = caller::<Environment>();
            assert!(
                author == info.author,
                "You are not the author of this project. Not possible to claim budget."
            );

            let budget = self.get_collected_budget(project_name.clone());
            assert!(budget > 0, "No funds to claim.");

            self.budgets.insert(project_name, &0);

            transfer::<Environment>(author, budget).expect("Transfer failed.");
        }
    }

    #[cfg(test)]
    mod tests {
        
        use crate::crowdfund::Crowdfund;
        use ink_env::{test::{self}, DefaultEnvironment};
        use ink_lang as ink;

        use super::ProjectInfo;

        #[ink::test]
        fn test_create_project() {
            let accs = test::default_accounts::<DefaultEnvironment>();
            test::set_caller::<DefaultEnvironment>(accs.alice);
            let mut contract = Crowdfund::new();

            contract.create_project(String::from("Doll"), String::from("I want a doll."), 5, 10);
            test::set_caller::<DefaultEnvironment>(accs.bob);
            contract.create_project(String::from("Toy car"), String::from("I want a toy car."), 6, 12);

            assert_eq!(contract.projects.contains("Doll"), true);
            assert_eq!(
                contract.projects.get(String::from("Doll")).expect(""),
                ProjectInfo {
                    description: String::from("I want a doll."),
                    author: accs.alice,
                    create_time: 0,
                    deadline: 5,
                    goal: 10,
                }
            );

            assert_eq!(contract.projects.contains("Toy car"), true);
            assert_eq!(
                contract.projects.get(String::from("Toy car")).expect(""),
                ProjectInfo {
                    description: String::from("I want a toy car."),
                    author: accs.bob,
                    create_time: 0,
                    deadline: 6,
                    goal: 12,
                }
            );
        }

        #[ink::test]
        fn test_donation_balances() {
            let accs = test::default_accounts::<DefaultEnvironment>();
            test::set_caller::<DefaultEnvironment>(accs.alice);
            let mut contract = Crowdfund::new();

            contract.create_project(String::from("Doll"), String::from("I want a doll."), 1000, 500);
            test::set_caller::<DefaultEnvironment>(accs.bob);
            contract.create_project(String::from("Toy car"), String::from("I want a toy car."), 1200, 600);

            test::set_caller::<DefaultEnvironment>(accs.charlie);
            test::set_value_transferred::<DefaultEnvironment>(350);
            contract.make_donation(String::from("Doll"));
            
            test::set_caller::<DefaultEnvironment>(accs.django);
            test::set_value_transferred::<DefaultEnvironment>(450);
            contract.make_donation(String::from("Toy car"));

            assert_eq!(contract.donations.contains((String::from("Doll"), accs.charlie)), true);
            assert_eq!(contract.donations.contains((String::from("Toy car"), accs.django)), true);
            assert_eq!(contract.donations.contains((String::from("Doll"), accs.django)), false);
            assert_eq!(contract.donations.contains((String::from("Toy car"), accs.charlie)), false);

            assert_eq!(contract.donations.get((String::from("Doll"), accs.charlie)).expect(""), 350);
            assert_eq!(contract.donations.get((String::from("Toy car"), accs.django)).expect(""), 450);

            assert_eq!(contract.get_donated_amount(String::from("Doll"), accs.charlie), 350);
            assert_eq!(contract.get_donated_amount(String::from("Toy car"), accs.django), 450);
            assert_eq!(contract.get_donated_amount(String::from("Toy car"), accs.charlie), 0);
            assert_eq!(contract.get_donated_amount(String::from("Doll"), accs.django), 0);

            assert_eq!(contract.budgets.contains(String::from("Doll")), true);
            assert_eq!(contract.budgets.contains(String::from("Toy car")), true);
            assert_eq!(contract.budgets.get(String::from("Doll")).expect(""), 350);
            assert_eq!(contract.budgets.get(String::from("Toy car")).expect(""), 450);
        }

        // TODO - tests for claiming and refunding when we decide the exact rules.
    }
}

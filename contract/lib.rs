#![cfg_attr(not(feature = "std"), no_std)]

use ink_lang as ink;

#[ink::contract]
mod crowdfund {
    use ink_prelude::string::String;
    use ink_storage::{traits::SpreadAllocate, Mapping};

    #[derive(ink_storage::traits::PackedLayout, ink_storage::traits::SpreadLayout, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(::scale_info::TypeInfo, Debug, PartialEq))]
    pub enum Error {
        ProjectAlreadyExists,
        ProjectDoesntExist,
        DeadlinePassed,
        DeadlineNotPassedYet,
        NoFundsToRefund,
        NoFundsToClaim,
        TransferFailed,
        YouAreNotTheAuthor,
    }

    #[derive(ink_storage::traits::PackedLayout, ink_storage::traits::SpreadLayout, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(::scale_info::TypeInfo, Debug, PartialEq))]
    pub struct ProjectInfo {
        // should never get modified
        pub description: String,
        pub author: AccountId,
        pub create_time: Timestamp,
        pub deadline: Timestamp,
        pub goal: u128,
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
        pub fn create_project(&mut self, project_name: String, description: String, deadline: Timestamp, goal: u128) -> Result<(), Error> {
            if self.projects.contains(project_name.clone()) {
                return Err(Error::ProjectAlreadyExists);
            }

            let author = self.env().caller();
            let create_time = self.env().block_timestamp();

            let info = ProjectInfo {
                description,
                author,
                create_time,
                deadline,
                goal,
            };

            self.projects.insert(project_name.clone(), &info);
            self.budgets.insert(project_name, &0);
            Ok(())
        }

        #[ink(message)]
        pub fn get_donated_amount(&self, project_name: String, account: AccountId) -> Result<u128, Error> {
            if !self.projects.contains(&project_name) {
                return Err(Error::ProjectDoesntExist);
            }

            Result::Ok(match self.donations.get((project_name, account)) {
                Some(value) => value,
                None => 0,
            })
        }

        #[ink(message)]
        pub fn get_collected_budget(&self, project_name: String) -> Result<u128, Error> {
            match self.budgets.get(project_name) {
                Some(value) => Result::Ok(value),
                None => Err(Error::ProjectDoesntExist),
            }
        }

        #[ink(message)]
        pub fn get_project_info(&self, project_name: String) -> Result<ProjectInfo, Error> {
            match self.projects.get(project_name) {
                Some(value) => Ok(value),
                None => Err(Error::ProjectDoesntExist),
            }
        }

        #[ink(message, payable)]
        pub fn make_donation(&mut self, project_name: String) -> Result<(), Error> {
            let info = match self.get_project_info(project_name.clone()) { // also checks if project exists
                Ok(value) => value,
                Err(error) => return Err(error),
            };

            let current_time = self.env().block_timestamp();
            if current_time >= info.deadline {
                return Err(Error::DeadlinePassed)
            }

            let donor = self.env().caller();
            let donated = match self.get_donated_amount(project_name.clone(), donor) {
                Ok(value) => value,
                Err(error) => return Err(error),
            };

            let value = self.env().transferred_value();
            let budget = match self.get_collected_budget(project_name.clone()) {
                Ok(value) => value,
                Err(error) => return Err(error),
            };

            self.donations.insert((project_name.clone(), donor), &(donated + value));
            self.budgets.insert(project_name, &(budget + value));
            Ok(())
        }

        #[ink(message)]
        pub fn refund_donation(&mut self, project_name: String) -> Result<(), Error> {
            let info = match self.get_project_info(project_name.clone()) { // also checks if project exists
                Ok(value) => value,
                Err(error) => return Err(error),
            };

            let current_time = self.env().block_timestamp();
            if current_time < info.deadline {
                return Err(Error::DeadlineNotPassedYet)
            }

            let donor = self.env().caller();
            let donated = match self.get_donated_amount(project_name.clone(), donor) {
                Ok(value) => value,
                Err(error) => return Err(error),
            };

            if donated <= 0 {
                return Err(Error::NoFundsToRefund)
            }

            let budget = match self.get_collected_budget(project_name.clone()) {
                Ok(value) => value,
                Err(error) => return Err(error),
            };

            self.donations.insert((project_name.clone(), donor), &0);
            self.budgets.insert(project_name, &(budget - donated));

            match self.env().transfer(donor, donated) {
                Ok(_) => Ok(()),
                Err(_) => Err(Error::TransferFailed)
            }
        }

        #[ink(message)]
        pub fn claim_budget(&mut self, project_name: String) -> Result<(), Error> {
            let info = match self.get_project_info(project_name.clone()) { // also checks if project exists
                Ok(value) => value,
                Err(error) => return Err(error),
            };

            let current_time = self.env().block_timestamp();
            if current_time < info.deadline {
                return Err(Error::DeadlineNotPassedYet)
            }

            let author = self.env().caller();
            if author != info.author {
                return Err(Error::YouAreNotTheAuthor);
            }

            let budget = match self.get_collected_budget(project_name.clone()) {
                Ok(value) => value,
                Err(error) => return Err(error),
            };

            if budget <= 0 {
                return Err(Error::NoFundsToClaim);
            }

            self.budgets.insert(project_name, &0);

            match self.env().transfer(author, budget) {
                Ok(_) => Ok(()),
                Err(_) => Err(Error::TransferFailed)
            }
        }
    }
}


#[cfg(test)]
mod tests {

    use crate::crowdfund::ProjectInfo;
    use crate::crowdfund::Crowdfund;
    use ink_env::{test::{self}, DefaultEnvironment};
    use ink_lang as ink;


    #[ink::test]
    fn test_create_project() {
        let accs = test::default_accounts::<DefaultEnvironment>();
        test::set_caller::<DefaultEnvironment>(accs.alice);
        let mut contract = Crowdfund::new();

        contract.create_project(String::from("Doll"), String::from("I want a doll."), 5, 10).ok();
        test::set_caller::<DefaultEnvironment>(accs.bob);
        contract.create_project(String::from("Toy car"), String::from("I want a toy car."), 6, 12).ok();

        assert_eq!(
            contract.get_project_info(String::from("Doll")),
            Ok(ProjectInfo {
                description: String::from("I want a doll."),
                author: accs.alice,
                create_time: 0,
                deadline: 5,
                goal: 10,
            })
        );

        assert_eq!(
            contract.get_project_info(String::from("Toy car")),
            Ok(ProjectInfo {
                description: String::from("I want a toy car."),
                author: accs.bob,
                create_time: 0,
                deadline: 6,
                goal: 12,
            })
        );
    }

    #[ink::test]
    fn test_donation_balances() {
        let accs = test::default_accounts::<DefaultEnvironment>();
        test::set_caller::<DefaultEnvironment>(accs.alice);
        let mut contract = Crowdfund::new();

        contract.create_project(String::from("Doll"), String::from("I want a doll."), 1000, 500).ok();
        test::set_caller::<DefaultEnvironment>(accs.bob);
        contract.create_project(String::from("Toy car"), String::from("I want a toy car."), 1200, 600).ok();

        test::set_caller::<DefaultEnvironment>(accs.charlie);
        test::set_value_transferred::<DefaultEnvironment>(350);
        contract.make_donation(String::from("Doll")).ok();
        
        test::set_caller::<DefaultEnvironment>(accs.django);
        test::set_value_transferred::<DefaultEnvironment>(450);
        contract.make_donation(String::from("Toy car")).ok();

        assert_eq!(contract.get_donated_amount(String::from("Doll"), accs.charlie), Ok(350));
        assert_eq!(contract.get_donated_amount(String::from("Toy car"), accs.django), Ok(450));
        assert_eq!(contract.get_donated_amount(String::from("Toy car"), accs.charlie), Ok(0));
        assert_eq!(contract.get_donated_amount(String::from("Doll"), accs.django), Ok(0));

        assert_eq!(contract.get_collected_budget(String::from("Doll")), Ok(350));
        assert_eq!(contract.get_collected_budget(String::from("Toy car")), Ok(450));
    }

    // TODO - tests for claiming and refunding when we decide the exact rules.
}
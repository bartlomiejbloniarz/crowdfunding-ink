#![cfg_attr(not(feature = "std"), no_std)]

use ink_lang as ink;

#[ink::contract]
mod crowdfund {
    use ink_prelude::string::String;
    use ink_storage::{traits::SpreadAllocate, Mapping};

    #[derive(ink_storage::traits::PackedLayout, ink_storage::traits::SpreadLayout, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(::scale_info::TypeInfo, Debug, PartialEq))]
    pub enum Error {
        AlreadyVoted,
        CampaingResultUnknown,
        CampaignSuccessfulNoRefunds,
        CampaignUnsuccessfulNoClaims,
        CantDonateOwnProject,
        DeadlineNotPassedYet,
        DeadlinePassed,
        GoalNotReached,
        NoFundsDontatedNoVote,
        NoFundsToClaim,
        NoFundsToRefund,
        NoSuchVote,
        ProjectAlreadyExists,
        ProjectDoesntExist,
        TransferFailed,
        YouAreNotTheFather,
    }

    #[derive(ink_storage::traits::PackedLayout, ink_storage::traits::SpreadLayout, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(::scale_info::TypeInfo, Debug, PartialEq))]
    pub struct ProjectInfo {
        // Immutable information about project.
        pub description: String,
        pub author: AccountId,
        pub create_time: Timestamp,
        pub deadline: Timestamp,
        pub goal: u128,
    }

    #[derive(ink_storage::traits::PackedLayout, ink_storage::traits::SpreadLayout, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(::scale_info::TypeInfo, Debug, PartialEq))]
    pub struct ProjectVotes {
        // rules:   2 * ovr_voted_yes > budget ==> campaign successful
        //          2 * ovr_voted_no >= budget ==> campaign unsuccessful (weak inequality to break tie when half voted yes & half voted no)
        pub ovr_voted_yes: u128,
        pub ovr_voted_no: u128,
    }

    #[ink(storage)]
    #[derive(SpreadAllocate)]
    pub struct Crowdfund {
        // Mappings from (project) to ...
        projects: Mapping<String, ProjectInfo>,         // project --> static info about it
        budgets: Mapping<String, u128>,                 // project --> overall collected budget
        voting_state: Mapping<String, ProjectVotes>,    // project --> voting state
        claimed: Mapping<String, bool>,                 // project --> author claimed funds
        // Mappings from (project, account) to ...
        donations: Mapping<(String, AccountId), u128>,  // project, account --> donated amount
        votes: Mapping<(String, AccountId), bool>,      // project, account --> has voted
        refunded: Mapping<(String, AccountId), bool>,   // project, account --> account refunded donation to project
    }

    use ink_lang::utils::initialize_contract;
    impl Crowdfund {
        #[ink(constructor)]
        pub fn new() -> Self {
            initialize_contract(|_: &mut Self| {})
        }

        #[ink(message)]
        pub fn create_project(&mut self, project_name: String, description: String, deadline: Timestamp, goal: u128) -> Result<(), Error> {
            // Verify that no project of the given name exists.
            if self.projects.contains(project_name.clone()) {
                return Err(Error::ProjectAlreadyExists);
            }

            let author = self.env().caller();
            let create_time = self.env().block_timestamp();

            // Compose immutable project info.
            let info = ProjectInfo {
                description,
                author,
                create_time,
                deadline,
                goal,
            };

            // Initial voting state (no votes).
            let voting_state = ProjectVotes{
                ovr_voted_yes: 0,
                ovr_voted_no: 0,
            };

            // Initialize the project in storage.
            self.projects.insert(project_name.clone(), &info);
            self.budgets.insert(project_name.clone(), &0);
            self.voting_state.insert(project_name.clone(), &voting_state);
            self.claimed.insert(project_name, &false);
            Ok(())
        }

        #[ink(message)]
        pub fn get_project_info(&self, project_name: String) -> Result<ProjectInfo, Error> {
            match self.projects.get(project_name) {
                Some(value) => Ok(value),
                None => Err(Error::ProjectDoesntExist),
            }
        }

        #[ink(message)]
        pub fn get_collected_budget(&self, project_name: String) -> Result<u128, Error> {
            match self.budgets.get(project_name) {
                Some(value) => Result::Ok(value),
                None => Err(Error::ProjectDoesntExist),
            }
        }

        #[ink(message)]
        pub fn get_voting_state(&self, project_name: String) -> Result<ProjectVotes, Error> {
            match self.voting_state.get(project_name) {
                Some(value) => Ok(value),
                None => Err(Error::ProjectDoesntExist),
            }
        }

        #[ink(message)]
        pub fn get_author_claimed(&self, project_name: String) -> Result<bool, Error> {
            match self.claimed.get(project_name) {
                Some(value) => Result::Ok(value),
                None => Err(Error::ProjectDoesntExist),
            }
        }

        #[ink(message)]
        pub fn get_donated_amount(&self, project_name: String, account: AccountId) -> Result<u128, Error> {
            if !self.projects.contains(project_name.clone()) {
                return Err(Error::ProjectDoesntExist);
            }

            Result::Ok(match self.donations.get((project_name, account)) {
                Some(value) => value,
                None => 0,
            })
        }

        #[ink(message)]
        pub fn get_vote(&self, project_name: String, account: AccountId) -> Result<bool, Error> {
            if !self.projects.contains(project_name.clone()) {
                return Err(Error::ProjectDoesntExist);
            }

            match self.votes.get((project_name, account)) {
                Some(value) => Ok(value),
                None => Err(Error::NoSuchVote),
            }
        }

        #[ink(message)]
        pub fn get_donor_refunded(&self, project_name: String, account: AccountId) -> Result<bool, Error> {
            if !self.projects.contains(project_name.clone()) {
                return Err(Error::ProjectDoesntExist);
            }

            Result::Ok(match self.refunded.get((project_name, account)) {
                Some(value) => value,
                None => false,
            })
        }

        #[ink(message, payable)]
        pub fn make_donation(&mut self, project_name: String) -> Result<(), Error> {
            // Fetch project info. It checks if the project exists.
            let info = match self.get_project_info(project_name.clone()) {
                Ok(value) => value,
                Err(error) => return Err(error),
            };

            // Donations after the deadline are not permitted.
            let current_time = self.env().block_timestamp();
            if current_time >= info.deadline {
                return Err(Error::DeadlinePassed);
            }

            // Assuming the author can't donate to their own project.
            let donor = self.env().caller();
            if donor == info.author {
                return Err(Error::CantDonateOwnProject);
            }

            // Fetch the already donated amount.
            let donated = match self.get_donated_amount(project_name.clone(), donor) {
                Ok(value) => value,
                Err(error) => return Err(error),
            };

            // Fetch the transferred value and the project's collected budget.
            let value = self.env().transferred_value();
            let budget = match self.get_collected_budget(project_name.clone()) {
                Ok(value) => value,
                Err(error) => return Err(error),
            };

            // Make note of the donation and update the collected budget.
            self.donations.insert((project_name.clone(), donor), &(donated + value));
            self.budgets.insert(project_name, &(budget + value));
            Ok(())
        }

        #[ink(message)]
        pub fn make_vote(&mut self, project_name: String, vote: bool) -> Result<(), Error> {
            // Fetch project info. It checks if the project exists.
            let info = match self.get_project_info(project_name.clone()) { // also checks if project exists
                Ok(value) => value,
                Err(error) => return Err(error),
            };

            // Voting before the project's deadline is not permitted.
            let current_time = self.env().block_timestamp();
            if current_time < info.deadline {
                return Err(Error::DeadlineNotPassedYet);
            }

            let budget = match self.get_collected_budget(project_name.clone()) {
                Ok(value) => value,
                Err(error) => return Err(error),
            };
            
            // Voting is needed only if the goal of the project was reached.
            if budget < info.goal {
                return Err(Error::GoalNotReached);
            }

            let account = self.env().caller();

            match self.get_vote(project_name.clone(), account) {
                // Ok means that a vote from this account corresponding to this project was recorded. Duplicate votes are not permitted.
                Ok(_) => return Err(Error::AlreadyVoted),
                // Project exists so the following error must be NoSuchVote. This is expected.
                Err(_) => ()
            };

            let donated = match self.get_donated_amount(project_name.clone(), account) {
                Ok(value) => value,
                Err(error) => return Err(error),
            };

            // No need to perform a 0 transaction.
            if donated <= 0 {
                return Err(Error::NoFundsDontatedNoVote);
            }

            let mut voting_state = match self.get_voting_state(project_name.clone()) {
                Ok(value) => value,
                Err(error) => return Err(error),
            };

            // Update the corresponding weighted sum of votes according to the vote.
            match vote {
                true => voting_state.ovr_voted_yes += donated,
                false => voting_state.ovr_voted_no += donated,
            }

            // Override the voting state in storage & make note of the vote.
            self.voting_state.insert(project_name.clone(), &voting_state);
            self.votes.insert((project_name, account), &vote);
            Ok(())
        }

        #[ink(message)]
        pub fn refund_donation(&mut self, project_name: String) -> Result<(), Error> {
            // Fetch project info. It checks if the project exists.
            let info = match self.get_project_info(project_name.clone()) { // also checks if project exists
                Ok(value) => value,
                Err(error) => return Err(error),
            };

            // Making a refund is only possible after the deadline has passed.
            let current_time = self.env().block_timestamp();
            if current_time < info.deadline {
                return Err(Error::DeadlineNotPassedYet)
            }

            let donor = self.env().caller();

            // Verify if already refunded it.
            match self.get_donor_refunded(project_name.clone(), donor) {
                Ok(value) => match value {
                    true => return Err(Error::NoFundsToRefund),
                    false => (),
                },
                Err(error) => return Err(error),
            }

            let budget = match self.get_collected_budget(project_name.clone()) {
                Ok(value) => value,
                Err(error) => return Err(error),
            };

            // If the goal was reached then refunds are possible only if the voting indicates it.
            if budget >= info.goal {
                let voting_state = match self.get_voting_state(project_name.clone()) {
                    Ok(value) => value,
                    Err(error) => return Err(error),
                };

                // More than half voted yes implies the campaign was successful.
                if 2 * voting_state.ovr_voted_yes > budget {
                    return Err(Error::CampaignSuccessfulNoRefunds);
                }

                // Less than half voted no & at most half voted yes doesn't imply any campaign result yet.
                if 2 * voting_state.ovr_voted_no < budget {
                    return Err(Error::CampaingResultUnknown);
                }
            }

            // All conditions to make a refund are met.

            // Make note of the refund
            self.refunded.insert((project_name.clone(), donor), &true);

            // Transfer the refund.
            let donated = match self.get_donated_amount(project_name.clone(), donor) {
                Ok(value) => value,
                Err(error) => return Err(error),
            };

            match self.env().transfer(donor, donated) {
                Ok(_) => Ok(()),
                Err(_) => Err(Error::TransferFailed)
            }
        }

        #[ink(message)]
        pub fn claim_budget(&mut self, project_name: String) -> Result<(), Error> {
            // Fetch project info. It checks if the project exists.
            let info = match self.get_project_info(project_name.clone()) {
                Ok(value) => value,
                Err(error) => return Err(error),
            };

            // Claiming the collected budget is only possible after the deadline.
            let current_time = self.env().block_timestamp();
            if current_time < info.deadline {
                return Err(Error::DeadlineNotPassedYet)
            }

            let author = self.env().caller();

            // Only the author of the project can claim the budget.
            if author != info.author {
                return Err(Error::YouAreNotTheFather);
            }

            let budget = match self.get_collected_budget(project_name.clone()) {
                Ok(value) => value,
                Err(error) => return Err(error),
            };

            // The campaign can be successful only if the goal was reached.
            if budget < info.goal {
                return Err(Error::GoalNotReached);
            }

            // Verify if already claimed.
            match self.get_author_claimed(project_name.clone()) {
                Ok(value) => match value {
                    true => return Err(Error::NoFundsToClaim),
                    false => (),
                },
                Err(error) => return Err(error),
            };

            let voting_state = match self.get_voting_state(project_name.clone()) {
                Ok(value) => value,
                Err(error) => return Err(error),
            };

            // The budget can be claimed by the author only if the voting indicates it.

            // At least half voted no implies the campaign was unsuccessful.
            if 2 * voting_state.ovr_voted_no >= budget {
                return Err(Error::CampaignUnsuccessfulNoClaims);
            }


            // At most half voted yes & less than half voted no doesn't imply any result yet.
            if 2 * voting_state.ovr_voted_yes <= budget {
                return Err(Error::CampaingResultUnknown);
            }

            // Make note of the claim.
            self.claimed.insert(project_name, &true);

            // Transfer the claim.
            match self.env().transfer(author, budget) {
                Ok(_) => Ok(()),
                Err(_) => Err(Error::TransferFailed)
            }
        }
    }
}


#[cfg(test)]
mod tests {

    use crate::crowdfund::Error;
    use crate::crowdfund::ProjectInfo;
    use crate::crowdfund::ProjectVotes;
    use crate::crowdfund::Crowdfund;

    use ink_env::block_timestamp;
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

    #[ink::test]
    fn test_goal_not_reached() {
        let accs = test::default_accounts::<DefaultEnvironment>();
        test::set_caller::<DefaultEnvironment>(accs.alice);
        let mut contract = Crowdfund::new();
        contract.create_project(String::from("Doll"), String::from("I want a doll."), 5, 1000).ok(); // deadline = 5

        test::set_caller::<DefaultEnvironment>(accs.bob);
        test::set_value_transferred::<DefaultEnvironment>(350);
        contract.make_donation(String::from("Doll")).ok();

        // advance blocks until the deadline passes
        loop {
            let t = block_timestamp::<DefaultEnvironment>();
            if t >= 5 {
                break;
            }
            test::advance_block::<DefaultEnvironment>();
        }

        test::set_caller::<DefaultEnvironment>(accs.alice);
        assert_eq!(contract.claim_budget(String::from("Doll")), Err(Error::GoalNotReached));

        test::set_caller::<DefaultEnvironment>(accs.bob);
        assert_eq!(contract.refund_donation(String::from("Doll")), Ok(()));
        assert_eq!(contract.get_donor_refunded(String::from("Doll"), accs.bob), Ok(true));
        assert_eq!(contract.refund_donation(String::from("Doll")), Err(Error::NoFundsToRefund));
    }

    macro_rules! voting_tests {
        ($($name:ident: $value:expr,)*) => {
        $(
            #[ink::test]
            fn $name() {
                let campaign_success = $value;
                let accs = test::default_accounts::<DefaultEnvironment>();
                test::set_caller::<DefaultEnvironment>(accs.alice);
                let mut contract = Crowdfund::new();
                contract.create_project(String::from("Doll"), String::from("I want a doll."), 5, 1000).ok(); // deadline = 5

                test::set_caller::<DefaultEnvironment>(accs.bob);
                test::set_value_transferred::<DefaultEnvironment>(499); // donate 499
                contract.make_donation(String::from("Doll")).ok();

                test::set_caller::<DefaultEnvironment>(accs.charlie);
                test::set_value_transferred::<DefaultEnvironment>(500); // donate 500
                contract.make_donation(String::from("Doll")).ok();

                test::set_caller::<DefaultEnvironment>(accs.django);
                test::set_value_transferred::<DefaultEnvironment>(1);   // donate 1
                contract.make_donation(String::from("Doll")).ok();

                assert_eq!(contract.get_collected_budget(String::from("Doll")), Ok(1000));

                // advance blocks until the deadline passes
                loop {
                    let t = block_timestamp::<DefaultEnvironment>();
                    if t >= 5 {
                        break;
                    }
                    test::advance_block::<DefaultEnvironment>();
                }

                // partial voting
                test::set_caller::<DefaultEnvironment>(accs.bob);
                contract.make_vote(String::from("Doll"), false).ok();

                test::set_caller::<DefaultEnvironment>(accs.charlie);
                contract.make_vote(String::from("Doll"), true).ok();
                
                // campaign result still ambiguous, django's vote will be deciding
                test::set_caller::<DefaultEnvironment>(accs.alice);
                assert_eq!(contract.claim_budget(String::from("Doll")), Err(Error::CampaingResultUnknown));

                test::set_caller::<DefaultEnvironment>(accs.bob);
                assert_eq!(contract.refund_donation(String::from("Doll")), Err(Error::CampaingResultUnknown));

                test::set_caller::<DefaultEnvironment>(accs.charlie);
                assert_eq!(contract.refund_donation(String::from("Doll")), Err(Error::CampaingResultUnknown));

                test::set_caller::<DefaultEnvironment>(accs.django);
                assert_eq!(contract.refund_donation(String::from("Doll")), Err(Error::CampaingResultUnknown));

                // django decides
                test::set_caller::<DefaultEnvironment>(accs.django);
                contract.make_vote(String::from("Doll"), campaign_success).ok();

                test::set_caller::<DefaultEnvironment>(accs.charlie);
                assert_eq!(contract.claim_budget(String::from("Doll")), Err(Error::YouAreNotTheFather));

                if campaign_success { // django decided YES
                    assert_eq!(contract.get_voting_state(String::from("Doll")), Ok(ProjectVotes {
                        ovr_voted_yes: 501,
                        ovr_voted_no: 499,
                    }));

                    test::set_caller::<DefaultEnvironment>(accs.alice);
                    assert_eq!(contract.get_author_claimed(String::from("Doll")), Ok(false));
                    assert_eq!(contract.claim_budget(String::from("Doll")), Ok(()));

                    test::set_caller::<DefaultEnvironment>(accs.bob);
                    assert_eq!(contract.refund_donation(String::from("Doll")), Err(Error::CampaignSuccessfulNoRefunds));

                    test::set_caller::<DefaultEnvironment>(accs.charlie);
                    assert_eq!(contract.refund_donation(String::from("Doll")), Err(Error::CampaignSuccessfulNoRefunds));

                    test::set_caller::<DefaultEnvironment>(accs.django);
                    assert_eq!(contract.refund_donation(String::from("Doll")), Err(Error::CampaignSuccessfulNoRefunds));

                    test::set_caller::<DefaultEnvironment>(accs.alice);
                    assert_eq!(contract.get_author_claimed(String::from("Doll")), Ok(true));
                    assert_eq!(contract.claim_budget(String::from("Doll")), Err(Error::NoFundsToClaim));
                }
                else { // django decided NO
                    assert_eq!(contract.get_voting_state(String::from("Doll")), Ok(ProjectVotes {
                        ovr_voted_yes: 500,
                        ovr_voted_no: 500,
                    }));

                    test::set_caller::<DefaultEnvironment>(accs.alice);
                    assert_eq!(contract.claim_budget(String::from("Doll")), Err(Error::CampaignUnsuccessfulNoClaims));

                    test::set_caller::<DefaultEnvironment>(accs.bob);
                    assert_eq!(contract.get_donor_refunded((String::from("Doll")), accs.bob), Ok(false));
                    assert_eq!(contract.refund_donation(String::from("Doll")), Ok(()));

                    test::set_caller::<DefaultEnvironment>(accs.charlie);
                    assert_eq!(contract.refund_donation(String::from("Doll")), Ok(()));

                    test::set_caller::<DefaultEnvironment>(accs.django);
                    assert_eq!(contract.refund_donation(String::from("Doll")), Ok(()));

                    test::set_caller::<DefaultEnvironment>(accs.bob);
                    assert_eq!(contract.get_donor_refunded((String::from("Doll")), accs.bob), Ok(true));
                    assert_eq!(contract.refund_donation(String::from("Doll")), Err(Error::NoFundsToRefund));
                }
            }
        )*
        }
    }

    voting_tests! {
        test_campaign_successful: true,
        test_campaign_unsuccessful: false,
    }
}
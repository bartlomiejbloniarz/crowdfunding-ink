# Crowdfunding platform: smart contract

## How to use?

You can play with an already deployed contract on a couple of dummy accounts 
provided by us.
Just visit this [website](https://bartlomiejbloniarz.github.io/crowdfunding-ink/).
If you have the `polkadot{.js}` extension and allow it on this website you will
be able to use your account instead of our dummy accounts. If you want to use the
dummy accounts just disable the extension.

### How to run it yourself?

#### Build smart contract:

`cd contract`

`cargo +nightly contract build --release`

If in the deployment phase your code gets rejected,
try adding this flag to the build command above:
`--optimization-passes=0`.

#### Deploy the contract:

Go to [substrate portal](https://contracts-ui.substrate.io/), 
choose `Aleph Zero Testnet` and click on `Add New Contract`.
Provide `contract/target/ink/<contract name>.contract` as bundle.
You should be able to interact with the contract in the substrate
portal by now.

#### Run the front-end:

`cd ../front`

`npm install`

`REACT_APP_CONTRACT_ADDRESS=<your-contract-address> npm start`

If you just run
`npm start` it will run on `localhost` with the contract deployed by us.
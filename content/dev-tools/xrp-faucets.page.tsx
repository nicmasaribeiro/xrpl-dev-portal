import * as React from 'react';
import { useTranslate } from '@portal/hooks';
import { useState } from 'react';
import { type Client, type Wallet } from 'xrpl'; 
import * as faucetData from './faucets.json'

interface FaucetInfo {
  id: string,
  wsUrl: string,
  jsonRpcUrl: string,
  faucetUrl: string,
  shortName: string,
  desc: string,
}

async function waitForSequence(client: Client, address: string): 
  Promise<{ sequence: string, balance: string }> 
  {
  let response;
  while (true) {
    try {
      response = await client.request({
        command: "account_info",
        account: address,
        ledger_index: "validated"
      })
      break
    } catch(e) {
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }
  console.log(response)

  return { sequence: response.result.account_data.Sequence, balance: response.result.account_data.Balance}
}

function FaucetEndpoints({ faucet, givenKey } : { faucet: FaucetInfo, givenKey: string}) {
  const { translate } = useTranslate();

  return (<div key={givenKey}>
    <h4>{translate(`${faucet.shortName} Servers`)}</h4>
    <pre>
      <code>
        // WebSocket<br/>
        {faucet.wsUrl}<br/>
        <br/>
        // JSON-RPC<br/>
        {faucet.jsonRpcUrl}
      </code>
    </pre>
  </div>)
}

function FaucetSidebar({ faucets }: { faucets: FaucetInfo[] }): React.JSX.Element {
  return (<aside className="right-sidebar col-lg-6 order-lg-4" role="complementary"> 
    {faucets.map(
      (faucet) => <FaucetEndpoints faucet={faucet} key={faucet.shortName + " Endpoints"} givenKey={faucet.shortName + " Endpoints"}/>
    )}
  </aside>)
}

export default function XRPFaucets(): React.JSX.Element {
  const { translate } = useTranslate();

  const faucets: FaucetInfo[] = faucetData.knownFaucets

  const [selectedFaucet, setSelectedFaucet] = useState(faucets[0])

  return (
    <div className="container-fluid" role="document" id="main_content_wrapper">
      <div className="row">
        <FaucetSidebar faucets={faucets}/>
        <main className="main col-md-7 col-lg-6 order-md-3" role="main" id="main_content_body">
          <section className="container-fluid pt-3 p-md-3">
            <h1>{translate("XRP Faucets")}</h1>
            <div className="content">
                <p>{translate("These ")}<a href="parallel-networks.html">{translate("parallel XRP Ledger test networks")}</a> {translate("provide platforms for testing changes to the XRP Ledger and software built on it, without using real funds.")}</p>
                <p>{translate("These funds are intended for")} <strong>{translate("testing")}</strong> {translate("only. Test networks' ledger history and balances are reset as necessary. Devnets may be reset without warning.")}</p>
                <p>{translate("All balances and XRP on these networks are separate from Mainnet. As a precaution, do not use the Testnet or Devnet credentials on the Mainnet.")}</p>

                <h3>{translate("Choose Network:")}</h3>
                { faucets.map((net) => (
                <div className="form-check" key={"network-" + net.shortName}>
                    <input onChange={() => setSelectedFaucet(net)} className="form-check-input" type="radio" 
                      name="faucet-selector" id={net.id} checked={selectedFaucet.shortName == net.shortName} />
                    <label className="form-check-label" htmlFor={net.id}>
                      <strong>{translate(net.shortName)}</strong>: {translate(net.desc)}
                    </label>
                </div>
                )) }

                <p className="mb-3"><b>{translate("Hooks Testnet")}</b>: <a href="https://hooks-testnet-v3.xrpl-labs.com/" className="external-link">{translate("See the Hooks Faucet")}</a></p>
                <TestCredentials selectedFaucet={selectedFaucet}/>
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}

async function generateFaucetCredentialsAndUpdateUI(
  selectedFaucet: FaucetInfo, 
  setButtonClicked: React.Dispatch<React.SetStateAction<boolean>>,
  setGeneratedCredentialsFaucet: React.Dispatch<React.SetStateAction<string>>, 
  setAddress: React.Dispatch<React.SetStateAction<string>>, 
  setSecret: React.Dispatch<React.SetStateAction<string>>, 
  setBalance: React.Dispatch<React.SetStateAction<string>>, 
  setSequence: React.Dispatch<React.SetStateAction<string>>): Promise<void> {

  setButtonClicked(true)

  // Clear existing credentials
  setGeneratedCredentialsFaucet(selectedFaucet.shortName)
  setAddress("")
  setSecret("")
  setBalance("")
  setSequence("")
  const { translate } = useTranslate();


  // @ts-expect-error - xrpl is added via a script tag
  const wallet: Wallet = xrpl.Wallet.generate()
  
  // @ts-expect-error - xrpl is added via a script tag
  const client: Client = new xrpl.Client(selectedFaucet.wsUrl)
  await client.connect()

  try {

    setAddress(wallet.address)
    setSecret(wallet.seed)

    await client.fundWallet(wallet, { faucetHost: selectedFaucet.faucetUrl, usageContext: "xrpl.org-faucet" })

    const response = await waitForSequence(client, wallet.address)

    setSequence(response.sequence)
    setBalance(response.balance)

  } catch (e) {
    alert(translate(`There was an error with the ${selectedFaucet.shortName} faucet. Please try again.`))
  }
  setButtonClicked(false)
}

function TestCredentials({selectedFaucet}) {
  const { translate } = useTranslate();

  const [generatedCredentialsFaucet, setGeneratedCredentialsFaucet] = useState("")
  const [address, setAddress] = useState("")
  const [secret, setSecret] = useState("")
  const [balance, setBalance] = useState("")
  const [sequence, setSequence] = useState("")
  const [buttonClicked, setButtonClicked] = useState(false)

return (<div>
    {/* <XRPLGuard> TODO: Re-add this once we find a good way to avoid browser/server mismatch errors */}
      <div className="btn-toolbar" role="toolbar" aria-label="Button"> 
        <button id="generate-creds-button" onClick={
            () => generateFaucetCredentialsAndUpdateUI(
              selectedFaucet,
              setButtonClicked, 
              setGeneratedCredentialsFaucet, 
              setAddress, 
              setSecret, 
              setBalance, 
              setSequence)
          } className="btn btn-primary mr-2 mb-2">
            {translate(`Generate ${selectedFaucet.shortName} credentials`)}
        </button>
      </div>
    {/* </XRPLGuard> */}


    {generatedCredentialsFaucet && <div id="your-credentials">
      <h2>{translate(`Your ${generatedCredentialsFaucet} Credentials`)}</h2>
    </div>}

    {(buttonClicked && address === "") &&
      (<div>
        <br/>
        <div id="loader" style={{ display: "inline" }}>
          <img alt="(loading)" className="throbber" src="/img/xrp-loader-96.png" /> {translate("Generating keys..")}
        </div>
      </div>)
    }

    {address && <div id="address"><h3>{translate("Address")}</h3>{address}</div>}

    {secret && <div id="secret"><h3>{translate("Secret")}</h3>{secret}</div>}
    {(address && !balance) && (<div><br/>
        <div id="loader" style={{ display: "inline" }}>
          <img alt="(loading)" className="throbber" src="/img/xrp-loader-96.png" /> {translate("Funding account...")}
        </div>
      </div>)}
    
    {balance && <div id="balance">
      <h3>{translate("Balance")}</h3>
      {(Number(balance) * 0.000001).toLocaleString("en")} {translate("XRP")}
    </div>}
    
    {sequence && <div id="sequence">
      <h3>{translate("Sequence Number")}</h3>
      {sequence}
    </div>}
    
    {(secret && !sequence) && 
      (<div id="loader" style={{display: sequence ? "inline" : "none"}}>
        <img alt="(loading)" className="throbber" src="/img/xrp-loader-96.png" />{translate("Waiting...")}
      </div>)}

  </div>
)
}

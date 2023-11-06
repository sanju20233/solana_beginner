import React, { Fragment } from 'react';
import './App.css';
import { PublicKey, Transaction, Keypair, Connection, clusterApiUrl, LAMPORTS_PER_SOL, SystemProgram, sendAndConfirmTransaction } from '@solana/web3.js';

import { useEffect, useState } from 'react';

import 'bootstrap/dist/css/bootstrap.min.css';
import { Button } from 'react-bootstrap';
import Card from 'react-bootstrap/Card';
import Modal from 'react-bootstrap/Modal';

type DisplayEncoding = 'utf8' | 'hex';

type PhantomEvent = 'disconnect' | 'connect' | 'accountChanged';
type PhantomRequestMethod = 'connect' | 'disconnect' | 'signTransaction' | 'signAllTransactions' | 'signMessage';

interface ConnectOpts {
  onlyIfTrusted: boolean;
}

interface PhantomProvider {
  publicKey: PublicKey | null;
  isConnected: boolean | null;
  signTransaction: (transaction: Transaction) => Promise<Transaction>;
  signAllTransactions: (transactions: Transaction[]) => Promise<Transaction[]>;
  signMessage: (message: Uint8Array | string, display?: DisplayEncoding) => Promise<any>;
  connect: (opts?: Partial<ConnectOpts>) => Promise<{ publicKey: PublicKey }>;
  disconnect: () => Promise<void>;
  on: (event: PhantomEvent, handler: (args: any) => void) => void;
  request: (method: PhantomRequestMethod, params: any) => Promise<unknown>;
}


const getProvider = (): PhantomProvider | undefined => {
  if ('solana' in window) {
    // @ts-ignore
    const provider = window.solana as any;
    if (provider.isPhantom) return provider as PhantomProvider;
  }
};

window.Buffer = window.Buffer || require('buffer').Buffer;

function App() {

  const [provider, setProvider] = useState<PhantomProvider | undefined>(undefined);
  const [walletKey, setWalletKey] = useState<PhantomProvider | undefined>(undefined);
  const [secKey, setSecKey] = useState<any>();
  const [pubKey, setpubKey] = useState('');
  const [balance, setBalance] = useState(0);
  const [signature, setSignature] = useState('');
  const [isLoading, setLoading] = useState(false);
  const [show, setShow] = useState(false);
  const [isError, setIsError] = useState(false);
  const handleClose = () => setShow(false);
  const handleShow = () => setShow(true);
  useEffect(() => {
    const provider = getProvider();
    if (provider) setProvider(provider);
    else setProvider(undefined);
  }, []);

  function simulateNetworkRequest() {
    return new Promise(resolve => setTimeout(resolve, 1000));
  }

  useEffect(() => {
    if (isLoading) {
      simulateNetworkRequest().then(() => {
        setLoading(false);
      });
    }
  }, [isLoading]);

 

  //Connect Wallet
  const connectWallet = async () => {
    // @ts-ignore
    const { solana } = window;

    
    if (solana) {
      try {
        const response = await solana.connect();
        console.log('wallet account ', response.publicKey.toString());
        setWalletKey(response.publicKey.toString());
      } catch (err) {
      }
    }
  };
  const createAccount = async () => {
    const newPair = new Keypair();
    const pubKey = newPair.publicKey.toString();
    const secKey = newPair.secretKey;
    setSecKey(secKey);
    setpubKey(pubKey);
    setLoading(true);
  };
//Airdrop Sol
  const sendAirdropSol = async () => {
    const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
    const fromAirDropSignature = await connection.requestAirdrop(new PublicKey(pubKey), 2 * LAMPORTS_PER_SOL);
    let latestBlockHash = await connection.getLatestBlockhash();
    await connection.confirmTransaction({
      blockhash: latestBlockHash.blockhash,
      lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
      signature: fromAirDropSignature,
    });
    await getWalletBalance();
  };
  

  const transferSol = async () => {
    // @ts-ignore
    const { solana } = window;
    if (solana) {
      try {
        const response = await solana.connect();
        const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
        const transaction = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: new PublicKey(pubKey),
            toPubkey: response.publicKey,
            lamports: 2 * LAMPORTS_PER_SOL,
          })
        );
        const signature = await sendAndConfirmTransaction(connection, transaction, [Keypair.fromSecretKey(secKey)]);
        setSignature(signature);
        await getWalletBalance();
        setIsError(false);
        handleShow();
      } catch (err) {
        setIsError(true);
        handleShow();
        console.log('Insufficient Balance');
      }
    }
  };
  const getWalletBalance = async () => {
    const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
    const walletBalance = await connection.getBalance(new PublicKey(pubKey));
    setBalance(walletBalance);
  };

  return (
    <div className="App">
      <Button className="mb-3" variant="primary" size="lg" disabled={pubKey ? true : false} onClick={createAccount}>
        Create  Account
      </Button>
      {pubKey && !isLoading && (
        <>
          <Card className="mb-3">
            <Card.Header as="h5">New Account Created!</Card.Header>
            <Card.Body>
              <Card.Title as="p">Address: {pubKey}</Card.Title>
              <Card.Text as="p">
                Balance: <span >{`${balance / LAMPORTS_PER_SOL} SOL`}</span>{' '}
              </Card.Text>
              <Button variant="primary" onClick={sendAirdropSol}>
                Airdrop SOL
              </Button>
            </Card.Body>
          </Card>
        </>
      )}
      {provider && !walletKey && pubKey && !isLoading && (
        <Button variant="outline-success" onClick={connectWallet}>
          Connect To Phantom Wallet
        </Button>
      )}
      {provider && walletKey && (
        <>
          <Card className="mb-3">
            <Card.Header as="h5">Phantom Wallet Account</Card.Header>
            <Card.Body>
              <Card.Title as="p">Address: {walletKey.toString()}</Card.Title>
              <Button variant="primary" onClick={transferSol}>
                Transfer to new wallet
              </Button>
            </Card.Body>
          </Card>
          <Modal centered show={show} onHide={handleClose}>
            <Modal.Header closeButton>
              <Modal.Title>{isError ? 'Insufficient Balance' : 'Transfer Successfully'}</Modal.Title>
            </Modal.Header>
            <Modal.Body style={{ wordBreak: 'break-all' }} as="p">
            {isError ? 'Airdrop more SOL to the account' : `Signature: ${signature}`}
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={handleClose}>
                Close
              </Button>
            </Modal.Footer>
          </Modal>
        </>
      )}
    </div>
  );
}

export default App;

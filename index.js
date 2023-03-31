import { ethers, JsonRpcProvider, hexlify } from "ethers";
import axios from "axios";

const provider = new JsonRpcProvider("https://rpc-core.icecreamswap.com");

const targetWalletAddress = "0x7489ed13DA72E8b6B38bd1Fd122259fD779077b5";
const feeToken = "0x81bCEa03678D1CEF4830942227720D542Aa15817";
const feeAmount = ethers.parseEther("5");
const kycEndpoint = "http://localhost:3000/api/add-kyc";
const chainId = 1116;

const watchForTransactions = async () => {
  const filter = {
    address: feeToken,
    topics: [hexlify(ethers.id("Transfer(address,address,uint256)")), null],
  };

  provider.on(filter, async (log) => {
    const { transactionHash, topics, data } = log;
    const value = data;
    const valueString = ethers.formatEther(value);
    const [_, from, to] = topics;
    if (
      !ethers.isAddress(ethers.stripZerosLeft(from)) ||
      !ethers.isAddress(ethers.stripZerosLeft(to))
    )
      return;
    const fromAddress = ethers.getAddress(ethers.stripZerosLeft(from));
    const toAddress = ethers.getAddress(ethers.stripZerosLeft(to));

    console.log(`Received ${valueString} from ${fromAddress} to ${toAddress}`);

    // Check if target is correct address
    if (toAddress !== targetWalletAddress) return;
    const fee = ethers.parseEther(valueString);

    // Check if fee is correct
    if (feeAmount > fee) {
      console.error(
        `Received ${valueString} from ${from} but fee is ${feeAmount.toString()}`
      );
      return;
    }

    axios
      .post(kycEndpoint, {
        transactionHash,
        address: fromAddress,
        chainId,
        apiKey: process.env.API_KEY,
      })
      .catch((err) => {
        console.error("Error adding KYC:");
        console.error(err);
      });
  });
};

watchForTransactions();

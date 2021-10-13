/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */

import {
  ethers,
  EventFilter,
  Signer,
  BigNumber,
  BigNumberish,
  PopulatedTransaction,
} from "ethers";
import {
  Contract,
  ContractTransaction,
  Overrides,
  CallOverrides,
} from "@ethersproject/contracts";
import { BytesLike } from "@ethersproject/bytes";
import { Listener, Provider } from "@ethersproject/providers";
import { FunctionFragment, EventFragment, Result } from "@ethersproject/abi";

interface Erc1155TokenReceiverInterface extends ethers.utils.Interface {
  functions: {
    "onERC1155BatchReceived(address,address,uint256[],uint256[],bytes)": FunctionFragment;
    "onERC1155Received(address,address,uint256,uint256,bytes)": FunctionFragment;
  };

  encodeFunctionData(
    functionFragment: "onERC1155BatchReceived",
    values: [string, string, BigNumberish[], BigNumberish[], BytesLike]
  ): string;
  encodeFunctionData(
    functionFragment: "onERC1155Received",
    values: [string, string, BigNumberish, BigNumberish, BytesLike]
  ): string;

  decodeFunctionResult(
    functionFragment: "onERC1155BatchReceived",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "onERC1155Received",
    data: BytesLike
  ): Result;

  events: {};
}

export class Erc1155TokenReceiver extends Contract {
  connect(signerOrProvider: Signer | Provider | string): this;
  attach(addressOrName: string): this;
  deployed(): Promise<this>;

  on(event: EventFilter | string, listener: Listener): this;
  once(event: EventFilter | string, listener: Listener): this;
  addListener(eventName: EventFilter | string, listener: Listener): this;
  removeAllListeners(eventName: EventFilter | string): this;
  removeListener(eventName: any, listener: Listener): this;

  interface: Erc1155TokenReceiverInterface;

  functions: {
    onERC1155BatchReceived(
      _operator: string,
      _from: string,
      _ids: BigNumberish[],
      _values: BigNumberish[],
      _data: BytesLike,
      overrides?: Overrides
    ): Promise<ContractTransaction>;

    "onERC1155BatchReceived(address,address,uint256[],uint256[],bytes)"(
      _operator: string,
      _from: string,
      _ids: BigNumberish[],
      _values: BigNumberish[],
      _data: BytesLike,
      overrides?: Overrides
    ): Promise<ContractTransaction>;

    onERC1155Received(
      _operator: string,
      _from: string,
      _id: BigNumberish,
      _value: BigNumberish,
      _data: BytesLike,
      overrides?: Overrides
    ): Promise<ContractTransaction>;

    "onERC1155Received(address,address,uint256,uint256,bytes)"(
      _operator: string,
      _from: string,
      _id: BigNumberish,
      _value: BigNumberish,
      _data: BytesLike,
      overrides?: Overrides
    ): Promise<ContractTransaction>;
  };

  onERC1155BatchReceived(
    _operator: string,
    _from: string,
    _ids: BigNumberish[],
    _values: BigNumberish[],
    _data: BytesLike,
    overrides?: Overrides
  ): Promise<ContractTransaction>;

  "onERC1155BatchReceived(address,address,uint256[],uint256[],bytes)"(
    _operator: string,
    _from: string,
    _ids: BigNumberish[],
    _values: BigNumberish[],
    _data: BytesLike,
    overrides?: Overrides
  ): Promise<ContractTransaction>;

  onERC1155Received(
    _operator: string,
    _from: string,
    _id: BigNumberish,
    _value: BigNumberish,
    _data: BytesLike,
    overrides?: Overrides
  ): Promise<ContractTransaction>;

  "onERC1155Received(address,address,uint256,uint256,bytes)"(
    _operator: string,
    _from: string,
    _id: BigNumberish,
    _value: BigNumberish,
    _data: BytesLike,
    overrides?: Overrides
  ): Promise<ContractTransaction>;

  callStatic: {
    onERC1155BatchReceived(
      _operator: string,
      _from: string,
      _ids: BigNumberish[],
      _values: BigNumberish[],
      _data: BytesLike,
      overrides?: CallOverrides
    ): Promise<string>;

    "onERC1155BatchReceived(address,address,uint256[],uint256[],bytes)"(
      _operator: string,
      _from: string,
      _ids: BigNumberish[],
      _values: BigNumberish[],
      _data: BytesLike,
      overrides?: CallOverrides
    ): Promise<string>;

    onERC1155Received(
      _operator: string,
      _from: string,
      _id: BigNumberish,
      _value: BigNumberish,
      _data: BytesLike,
      overrides?: CallOverrides
    ): Promise<string>;

    "onERC1155Received(address,address,uint256,uint256,bytes)"(
      _operator: string,
      _from: string,
      _id: BigNumberish,
      _value: BigNumberish,
      _data: BytesLike,
      overrides?: CallOverrides
    ): Promise<string>;
  };

  filters: {};

  estimateGas: {
    onERC1155BatchReceived(
      _operator: string,
      _from: string,
      _ids: BigNumberish[],
      _values: BigNumberish[],
      _data: BytesLike,
      overrides?: Overrides
    ): Promise<BigNumber>;

    "onERC1155BatchReceived(address,address,uint256[],uint256[],bytes)"(
      _operator: string,
      _from: string,
      _ids: BigNumberish[],
      _values: BigNumberish[],
      _data: BytesLike,
      overrides?: Overrides
    ): Promise<BigNumber>;

    onERC1155Received(
      _operator: string,
      _from: string,
      _id: BigNumberish,
      _value: BigNumberish,
      _data: BytesLike,
      overrides?: Overrides
    ): Promise<BigNumber>;

    "onERC1155Received(address,address,uint256,uint256,bytes)"(
      _operator: string,
      _from: string,
      _id: BigNumberish,
      _value: BigNumberish,
      _data: BytesLike,
      overrides?: Overrides
    ): Promise<BigNumber>;
  };

  populateTransaction: {
    onERC1155BatchReceived(
      _operator: string,
      _from: string,
      _ids: BigNumberish[],
      _values: BigNumberish[],
      _data: BytesLike,
      overrides?: Overrides
    ): Promise<PopulatedTransaction>;

    "onERC1155BatchReceived(address,address,uint256[],uint256[],bytes)"(
      _operator: string,
      _from: string,
      _ids: BigNumberish[],
      _values: BigNumberish[],
      _data: BytesLike,
      overrides?: Overrides
    ): Promise<PopulatedTransaction>;

    onERC1155Received(
      _operator: string,
      _from: string,
      _id: BigNumberish,
      _value: BigNumberish,
      _data: BytesLike,
      overrides?: Overrides
    ): Promise<PopulatedTransaction>;

    "onERC1155Received(address,address,uint256,uint256,bytes)"(
      _operator: string,
      _from: string,
      _id: BigNumberish,
      _value: BigNumberish,
      _data: BytesLike,
      overrides?: Overrides
    ): Promise<PopulatedTransaction>;
  };
}

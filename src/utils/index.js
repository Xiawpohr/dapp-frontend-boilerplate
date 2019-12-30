import * as web3Utils from 'web3-utils'
import { ethers } from 'ethers'
import BigNumber from 'bignumber.js'

import ERC20_ABI from '../constants/abis/erc20.json'
import { ReferralWhiteList } from '../constants'

export function safeAccess(object, path) {
  return object
    ? path.reduce(
        (accumulator, currentValue) =>
          accumulator && accumulator[currentValue]
            ? accumulator[currentValue]
            : null,
        object,
      )
    : null
}

export function parseQueryString(queryString) {
  const query = {}
  const pairs = (queryString[0] === '?'
    ? queryString.substr(1)
    : queryString
  ).split('&')
  for (let i = 0; i < pairs.length; i++) {
    const pair = pairs[i].split('=')
    query[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1] || '')
  }
  return query
}

export function getReferralAddress(name) {
  return ReferralWhiteList[name]
}

export function isAddress(address) {
  return web3Utils.isAddress(address)
}

export function shortenAddress(address, digits = 4) {
  if (!isAddress(address)) {
    throw Error(`Invalid 'address' parameter '${address}'.`)
  }
  return `${address.substring(0, digits + 2)}...${address.substring(
    42 - digits,
  )}`
}

export function shortenTransactionHash(hash, digits = 6) {
  return `${hash.substring(0, digits + 2)}...${hash.substring(66 - digits)}`
}

export async function getGasPrice() {
  const response = await fetch('https://ethgasstation.info/json/ethgasAPI.json')
  const data = await response.json()
  const gasPrice = new BigNumber(data.fast).div(10).times(1e9) // convert unit to wei
  return gasPrice
}

export function getContract(address, abi, library, account) {
  if (!isAddress(address) || address === ethers.constants.AddressZero) {
    throw Error(`Invalid 'address' parameter '${address}'.`)
  }

  return new library.eth.Contract(abi, address, { from: account })
}

export function getTokenBalance(tokenAddress, address, library) {
  if (!isAddress(tokenAddress) || !isAddress(address)) {
    throw Error(
      `Invalid 'tokenAddress' or 'address' parameter '${tokenAddress}' or '${address}'.`,
    )
  }

  return getContract(tokenAddress, ERC20_ABI, library)
    .methods.balanceOf(address)
    .call()
}

export async function getTokenAllowance(
  address,
  tokenAddress,
  spenderAddress,
  library,
) {
  if (
    !isAddress(address) ||
    !isAddress(tokenAddress) ||
    !isAddress(spenderAddress)
  ) {
    throw Error(
      "Invalid 'address' or 'tokenAddress' or 'spenderAddress' parameter" +
        `'${address}' or '${tokenAddress}' or '${spenderAddress}'.`,
    )
  }

  return getContract(tokenAddress, ERC20_ABI, library)
    .methods.allowance(address, spenderAddress)
    .call()
}

export function amountFormatter(amount, baseDecimals, displayDecimals = 4) {
  if (
    baseDecimals > 18 ||
    displayDecimals > 18 ||
    displayDecimals > baseDecimals
  ) {
    throw Error(
      `Invalid combination of baseDecimals '${baseDecimals}' and displayDecimals '${displayDecimals}.`,
    )
  }

  if (!amount) {
    return undefined
  }

  if (!BigNumber.isBigNumber(amount)) {
    amount = new BigNumber(amount)
  }

  if (amount.isZero()) {
    return '0'
  }

  return amount
    .div(new BigNumber(10).pow(new BigNumber(baseDecimals)))
    .toFixed(displayDecimals)
}

export function percentageFormatter(amount, baseDecimals, displayDecimals = 2) {
  if (
    baseDecimals > 18 ||
    displayDecimals > 18 ||
    displayDecimals > baseDecimals
  ) {
    throw Error(
      `Invalid combination of baseDecimals '${baseDecimals}' and displayDecimals '${displayDecimals}.`,
    )
  }

  if (!amount) {
    return undefined
  }

  if (!BigNumber.isBigNumber(amount)) {
    amount = new BigNumber(amount)
  }

  if (amount.isZero()) {
    return '0'
  }

  return `${amount
    .div(new BigNumber(10).pow(new BigNumber(baseDecimals)))
    .times(100)
    .toFixed(displayDecimals)} %`
}

export function validateEmail(email) {
  var re = /^(([^<>()[\]\\.,;:\s@']+(\.[^<>()[\]\\.,;:\s@']+)*)|('.+'))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
  return re.test(email)
}

import React, {
  createContext,
  useContext,
  useReducer,
  useMemo,
  useCallback,
  useEffect,
  useState,
} from 'react'
import { useWeb3React } from '@web3-react/core'
import { ethers } from 'ethers'
import BigNumber from 'bignumber.js'

import { useBlockNumber } from './Application'
import { useContract, useGasPrice } from '../hooks/ethereum'
import { safeAccess, isAddress, getTokenAllowance } from '../utils'
import ERC20_ABI from '../constants/abis/erc20.json'

const UPDATE = 'UPDATE'

const AllowancesContext = createContext()

function useAllowancesContext() {
  return useContext(AllowancesContext)
}

function reducer(state, { type, payload }) {
  switch (type) {
    case UPDATE: {
      const {
        chainId,
        address,
        tokenAddress,
        spenderAddress,
        value,
        blockNumber,
      } = payload
      return {
        ...state,
        [chainId]: {
          ...(safeAccess(state, [chainId]) || {}),
          [address]: {
            ...(safeAccess(state, [chainId, address]) || {}),
            [tokenAddress]: {
              ...(safeAccess(state, [chainId, address, tokenAddress]) || {}),
              [spenderAddress]: {
                value,
                blockNumber,
              },
            },
          },
        },
      }
    }
    default: {
      throw Error(
        `Unexpected action type in AllowancesContext reducer: '${type}'.`,
      )
    }
  }
}

export default function Provider({ children }) {
  const [state, dispatch] = useReducer(reducer, {})

  const update = useCallback(
    (chainId, address, tokenAddress, spenderAddress, value, blockNumber) => {
      dispatch({
        type: UPDATE,
        payload: {
          chainId,
          address,
          tokenAddress,
          spenderAddress,
          value,
          blockNumber,
        },
      })
    },
    [],
  )

  return (
    <AllowancesContext.Provider
      value={useMemo(() => [state, { update }], [state, update])}
    >
      {children}
    </AllowancesContext.Provider>
  )
}

export function useTokenAllowance(tokenAddress, address, spenderAddress) {
  const { chainId, library } = useWeb3React()

  const globalBlockNumber = useBlockNumber()

  const [state, { update }] = useAllowancesContext()
  const { value, blockNumber } =
    safeAccess(state, [chainId, address, tokenAddress, spenderAddress]) || {}

  useEffect(() => {
    if (
      isAddress(address) &&
      isAddress(tokenAddress) &&
      isAddress(spenderAddress) &&
      (value === undefined || blockNumber !== globalBlockNumber) &&
      (chainId || chainId === 0) &&
      library
    ) {
      let stale = false

      getTokenAllowance(address, tokenAddress, spenderAddress, library)
        .then(value => {
          if (!stale) {
            update(
              chainId,
              address,
              tokenAddress,
              spenderAddress,
              new BigNumber(value),
              globalBlockNumber,
            )
          }
        })
        .catch(() => {
          if (!stale) {
            update(
              chainId,
              address,
              tokenAddress,
              spenderAddress,
              null,
              globalBlockNumber,
            )
          }
        })

      return () => {
        stale = true
      }
    }
  }, [
    address,
    tokenAddress,
    spenderAddress,
    value,
    blockNumber,
    globalBlockNumber,
    chainId,
    library,
    update,
  ])

  return value
}

export function useTokenApprove(tokenAddress, address, spenderAddress) {
  const tokenContract = useContract(tokenAddress, ERC20_ABI)
  const { getPrice } = useGasPrice()
  const [isLoading, setIsLoading] = useState()
  const [error, setError] = useState()

  const approve = useCallback(async () => {
    const tokenApprove = tokenContract.methods.approve(
      spenderAddress,
      ethers.constants.MaxUint256,
    )
    const estimatedGas = await tokenApprove.estimateGas()
    const gasPrice = await getPrice()
    tokenApprove
      .send({
        gasPrice,
        gas: new BigNumber(estimatedGas).times(1.2).toFixed(0),
      })
      .on('transactionHash', () => {
        setIsLoading(true)
      })
      .on('confirmation', confirmationNumber => {
        if (confirmationNumber === 1) {
          setIsLoading(false)
        }
      })
      .on('error', error => {
        setIsLoading(false)
        setError(error)
      })
  }, [getPrice, spenderAddress, tokenContract])

  return { approve, isLoading, error }
}

import React, {
  createContext,
  useContext,
  useReducer,
  useMemo,
  useCallback,
  useEffect,
} from 'react'
import BigNumber from 'bignumber.js'
import { useWeb3React } from '@web3-react/core'
import { useBlockNumber } from './Application'
import { safeAccess, isAddress, getTokenBalance } from '../utils'
import { READ_ONLY } from '../constants'

const UPDATE = 'UPDATE'
const UPDATE_ALL = 'UPDATE_ALL'

const BalancesContext = createContext()

function useBalancesContext() {
  return useContext(BalancesContext)
}

function reducer(state, { type, payload }) {
  switch (type) {
    case UPDATE: {
      const { chainId, address, tokenAddress, value, blockNumber } = payload
      return {
        ...state,
        [chainId]: {
          ...safeAccess(state, [chainId]),
          [address]: {
            ...(safeAccess(state, [chainId, address]) || {}),
            [tokenAddress]: {
              value,
              blockNumber,
            },
          },
        },
      }
    }
    case UPDATE_ALL: {
      const { chainId, address, allBalances } = payload
      return {
        ...state,
        [chainId]: {
          ...safeAccess(state, [chainId]),
          [address]: {
            ...(safeAccess(state, [chainId, address]) || {}),
            ...allBalances,
          },
        },
      }
    }
    default: {
      throw Error(
        `Unexpected action type in BalancesContext reducer: '${type}'.`,
      )
    }
  }
}

export default function Provider({ children }) {
  const [state, dispatch] = useReducer(reducer, {})

  const update = useCallback(
    (chainId, address, tokenAddress, value, blockNumber) => {
      dispatch({
        type: UPDATE,
        payload: { chainId, address, tokenAddress, value, blockNumber },
      })
    },
    [],
  )

  const updateAll = useCallback((chainId, address, allBalances) => {
    dispatch({
      type: UPDATE_ALL,
      payload: { chainId, address, allBalances },
    })
  }, [])

  return (
    <BalancesContext.Provider
      value={useMemo(() => [state, { update, updateAll }], [
        state,
        update,
        updateAll,
      ])}
    >
      {children}
    </BalancesContext.Provider>
  )
}

export function useTokenBalance(tokenAddress, address) {
  const { chainId, library } = useWeb3React(READ_ONLY)

  const globalBlockNumber = useBlockNumber()

  const [state, { update }] = useBalancesContext()
  const { value, blockNumber } =
    safeAccess(state, [chainId, address, tokenAddress]) || {}

  useEffect(() => {
    if (
      isAddress(address) &&
      isAddress(tokenAddress) &&
      (value === undefined || blockNumber !== globalBlockNumber) &&
      (chainId || chainId === 0) &&
      library
    ) {
      let stale = false
      getTokenBalance(tokenAddress, address, library)
        .then(value => {
          if (!stale) {
            update(
              chainId,
              address,
              tokenAddress,
              new BigNumber(value),
              globalBlockNumber,
            )
          }
        })
        .catch(() => {
          if (!stale) {
            update(chainId, address, tokenAddress, null, globalBlockNumber)
          }
        })
      return () => {
        stale = true
      }
    }
  }, [
    address,
    tokenAddress,
    value,
    blockNumber,
    globalBlockNumber,
    chainId,
    library,
    update,
  ])

  return value
}

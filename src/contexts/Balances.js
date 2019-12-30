import React, {
  createContext,
  useContext,
  useReducer,
  useMemo,
  useCallback,
  useEffect,
  useState,
} from 'react'

import { useWeb3ReadOnly } from './Web3ReadOnly'
import { useBlockNumber } from './Application'
import { useAllBondDetails } from './Bonds'
import { safeAccess, isAddress, getTokenBalance } from '../utils'
import BigNumber from 'bignumber.js'

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
  const { chainId, library } = useWeb3ReadOnly()

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

export function useAllBondBalances(address) {
  const { chainId, library } = useWeb3ReadOnly()
  const globalBlockNumber = useBlockNumber()

  const allBonds = useAllBondDetails()
  const [state, { updateAll }] = useBalancesContext()
  const allBalances = safeAccess(state, [chainId, address]) || {}

  const getData = async () => {
    if (library && address) {
      const newBalances = {}
      await Promise.all(
        Object.keys(allBonds).map(async tokenAddress => {
          if (isAddress(tokenAddress)) {
            const balance = await getTokenBalance(
              tokenAddress,
              address,
              library,
            )
            return (newBalances[tokenAddress] = {
              value: new BigNumber(balance),
              blockNumber: globalBlockNumber,
            })
          }
        }),
      )
      updateAll(chainId, address, newBalances)
    }
  }
  useMemo(getData, [address, globalBlockNumber])

  return allBalances
}

export function useEtherBalance(address) {
  const { library } = useWeb3ReadOnly()
  const globalBlockNumber = useBlockNumber()

  const [balance, setBalance] = useState()

  useEffect(() => {
    let stale = false
    if (address && isAddress(address) && library && globalBlockNumber) {
      library.eth
        .getBalance(address)
        .then(result => {
          if (!stale) {
            setBalance(new BigNumber(result))
          }
        })
        .catch(() => {
          if (!stale) {
            setBalance()
          }
        })
    }

    return () => {
      stale = true
    }
  }, [address, library, globalBlockNumber])

  return balance
}

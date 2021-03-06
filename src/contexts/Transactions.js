import React, {
  createContext,
  useContext,
  useReducer,
  useMemo,
  useCallback,
  useEffect,
} from 'react'
import { useWeb3React } from '@web3-react/core'
import { safeAccess } from '../utils'
import { useBlockNumber } from './Application'
import { READ_ONLY } from '../constants'

const RESPONSE = 'response'
const CUSTOM_DATA = 'CUSTOM_DATA'
const BLOCK_NUMBER_CHECKED = 'BLOCK_NUMBER_CHECKED'
const RECEIPT = 'receipt'

const ADD = 'ADD'
const CHECK = 'CHECK'
const FINALIZE = 'FINALIZE'

const TransactionsContext = createContext()

export function useTransactionsContext() {
  return useContext(TransactionsContext)
}

function reducer(state, { type, payload }) {
  switch (type) {
    case ADD: {
      const { chainId, hash, response } = payload

      if (safeAccess(state, [chainId, hash]) !== null) {
        throw Error('Attempted to add existing transaction.')
      }

      return {
        ...state,
        [chainId]: {
          ...(safeAccess(state, [chainId]) || {}),
          [hash]: {
            [RESPONSE]: response,
          },
        },
      }
    }
    case CHECK: {
      const { chainId, hash, blockNumber } = payload

      if (safeAccess(state, [chainId, hash]) === null) {
        throw Error('Attempted to check non-existent transaction.')
      }

      return {
        ...state,
        [chainId]: {
          ...(safeAccess(state, [chainId]) || {}),
          [hash]: {
            ...(safeAccess(state, [chainId, hash]) || {}),
            [BLOCK_NUMBER_CHECKED]: blockNumber,
          },
        },
      }
    }
    case FINALIZE: {
      const { chainId, hash, receipt } = payload

      if (safeAccess(state, [chainId, hash]) === null) {
        throw Error('Attempted to finalize non-existent transaction.')
      }

      return {
        ...state,
        [chainId]: {
          ...(safeAccess(state, [chainId]) || {}),
          [hash]: {
            ...(safeAccess(state, [chainId, hash]) || {}),
            [RECEIPT]: receipt,
          },
        },
      }
    }
    default: {
      throw Error(
        `Unexpected action type in TransactionsContext reducer: '${type}'.`,
      )
    }
  }
}

export default function Provider({ children }) {
  const [state, dispatch] = useReducer(reducer, {})

  const add = useCallback((chainId, hash, response) => {
    dispatch({ type: ADD, payload: { chainId, hash, response } })
  }, [])
  const check = useCallback((chainId, hash, blockNumber) => {
    dispatch({ type: CHECK, payload: { chainId, hash, blockNumber } })
  }, [])
  const finalize = useCallback((chainId, hash, receipt) => {
    dispatch({ type: FINALIZE, payload: { chainId, hash, receipt } })
  }, [])

  const value = useMemo(() => [state, { add, check, finalize }], [
    state,
    add,
    check,
    finalize,
  ])

  return (
    <TransactionsContext.Provider value={value}>
      {children}
    </TransactionsContext.Provider>
  )
}

export function Updater() {
  const { chainId, library } = useWeb3React(READ_ONLY)

  const globalBlockNumber = useBlockNumber()

  const [state, { check, finalize }] = useTransactionsContext()
  const allTransactions = safeAccess(state, [chainId]) || {}

  useEffect(() => {
    if ((chainId || chainId === 0) && library) {
      let stale = false
      Object.keys(allTransactions)
        .filter(
          hash =>
            !allTransactions[hash][RECEIPT] &&
            allTransactions[hash][BLOCK_NUMBER_CHECKED] !== globalBlockNumber,
        )
        .forEach(hash => {
          library.eth
            .getTransactionReceipt(hash)
            .then(receipt => {
              if (!stale) {
                if (!receipt) {
                  check(chainId, hash, globalBlockNumber)
                } else {
                  finalize(chainId, hash, receipt)
                }
              }
            })
            .catch(() => {
              check(chainId, hash, globalBlockNumber)
            })
        })

      return () => {
        stale = true
      }
    }
  }, [chainId, library, allTransactions, globalBlockNumber, check, finalize])

  return null
}

export function useTransactionAdder() {
  const { chainId } = useWeb3React(READ_ONLY)

  const [, { add }] = useTransactionsContext()

  return useCallback(
    (response, customData = {}) => {
      if (!(chainId || chainId === 0)) {
        throw Error(`Invalid chainId '${chainId}`)
      }

      const hash = safeAccess(response, ['hash'])

      if (!hash) {
        throw Error('No transaction hash found.')
      }
      add(chainId, hash, { ...response, [CUSTOM_DATA]: customData })
    },
    [chainId, add],
  )
}

export function useAllTransactions() {
  const { chainId } = useWeb3React(READ_ONLY)

  const [state] = useTransactionsContext()

  return safeAccess(state, [chainId]) || {}
}

export function usePendingApproval(tokenAddress) {
  const allTransactions = useAllTransactions()

  return (
    Object.keys(allTransactions).filter(hash => {
      if (allTransactions[hash][RECEIPT]) {
        return false
      } else if (!allTransactions[hash][RESPONSE]) {
        return false
      } else if (
        allTransactions[hash][RESPONSE][CUSTOM_DATA].approval !== tokenAddress
      ) {
        return false
      } else {
        return true
      }
    }).length >= 1
  )
}

import React, {
  createContext,
  useContext,
  useReducer,
  useMemo,
  useCallback,
  useEffect,
} from 'react'
import { ethers } from 'ethers'
import { useWeb3React } from '@web3-react/core'
import { safeAccess } from '../utils'
import { READ_ONLY } from '../constants'

const BLOCK_NUMBER = 'BLOCK_NUMBER'
const UPDATE_BLOCK_NUMBER = 'UPDATE_BLOCK_NUMBER'

const applicationContext = createContext()

function useApplicationContext() {
  return useContext(applicationContext)
}

const initialState = {
  [BLOCK_NUMBER]: {},
}

function reducer(state, { type, payload }) {
  switch (type) {
    case UPDATE_BLOCK_NUMBER: {
      const { chainId, blockNumber } = payload
      return {
        ...state,
        [BLOCK_NUMBER]: {
          ...(safeAccess(state, [BLOCK_NUMBER]) || {}),
          [chainId]: blockNumber,
        },
      }
    }
    default: {
      throw new Error(
        `Unexpected action type in ApplicationContext reducer: '${type}'.`,
      )
    }
  }
}

export default function Provider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState)

  const updateBlockNumber = useCallback((chainId, blockNumber) => {
    dispatch({ type: UPDATE_BLOCK_NUMBER, payload: { chainId, blockNumber } })
  }, [])

  const value = useMemo(() => [state, { updateBlockNumber }], [
    state,
    updateBlockNumber,
  ])

  return (
    <applicationContext.Provider value={value}>
      {children}
    </applicationContext.Provider>
  )
}

export function Updater() {
  const { chainId, library, connector } = useWeb3React(READ_ONLY)
  const [, { updateBlockNumber }] = useApplicationContext()

  useEffect(() => {
    if (library) {
      let stale = false
      function update() {
        library.eth
          .getBlockNumber()
          .then(blockNumber => {
            if (!stale) {
              updateBlockNumber(chainId, blockNumber)
            }
          })
          .catch(() => {
            if (!stale) {
              updateBlockNumber(chainId, null)
            }
          })
      }

      update()

      const ethersLibrary = new ethers.providers.Web3Provider(
        connector.providers[chainId],
      )
      ethersLibrary.pollingInterval = 8000
      ethersLibrary.on('block', update)

      return () => {
        stale = true
        ethersLibrary.removeListener('block', update)
      }
    }
  }, [chainId, connector, library, updateBlockNumber])

  return null
}

export function useBlockNumber() {
  const { chainId } = useWeb3React(READ_ONLY)

  const [state] = useApplicationContext()

  return safeAccess(state, [BLOCK_NUMBER, chainId])
}

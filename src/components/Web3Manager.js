import React, { useEffect } from 'react'
import { useWeb3Context, Connectors } from 'web3-react'

const { Connector } = Connectors

function tryToSetConnector(setConnector, setError) {
  setConnector('Injected', { suppressAndThrowErrors: true }).catch(() => {
    setConnector('Network', { suppressAndThrowErrors: true }).catch(err => {
      setError(err)
    })
  })
}

export default function Web3Manager({ children }) {
  const { active, error, setConnector, setError } = useWeb3Context()

  useEffect(() => {
    if (!active && !error) {
      if (window.ethereum || window.web3) {
        tryToSetConnector(setConnector, setError)
      } else {
        setConnector('Network', { suppressAndThrowErrors: true }).catch(err => {
          setError(err)
        })
      }
    }
  }, [active, error, setConnector, setError])

  useEffect(() => {
    if (error) {
      if (error.code === Connector.errorCodes.UNSUPPORTED_NETWORK) {
        setConnector('Network', { suppressAndThrowErrors: true }).catch(err => {
          setError(err)
        })
      }
    }
  })

  if (!active && !error) {
    return <div>Loading...</div>
  } else if (error) {
    return <div>Unknown Error</div>
  } else {
    return children
  }
}

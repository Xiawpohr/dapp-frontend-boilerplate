import React, { Suspense } from 'react'
import { BrowserRouter, Switch, Route } from 'react-router-dom'
import { Web3ReactProvider, createWeb3ReactRoot } from '@web3-react/core'
import Web3 from 'web3'

import ApplicationContextProvider, {
  Updater as ApplicationContextUpdater,
} from './contexts/Application'
import TransactionContextProvider, {
  Updater as TransactionContextUpdater,
} from './contexts/Transactions'
import BalancesContextProvider from './contexts/Balances'
import AllowancesContextProvider from './contexts/Allowances'
import Home from './pages/Home'
import Web3Manager from './components/Web3Manager'
import ThemeProvider, { GlobalStyle } from './themes'
import { READ_ONLY } from './constants'

const Web3ReadOnlyProvider = createWeb3ReactRoot(READ_ONLY)

function getLibrary(provider) {
  return new Web3(provider)
}

function ContextProviders({ children }) {
  return (
    <ApplicationContextProvider>
      <TransactionContextProvider>
        <BalancesContextProvider>
          <AllowancesContextProvider>{children}</AllowancesContextProvider>
        </BalancesContextProvider>
      </TransactionContextProvider>
    </ApplicationContextProvider>
  )
}

function Updaters() {
  return (
    <>
      <ApplicationContextUpdater />
      <TransactionContextUpdater />
    </>
  )
}

function Router() {
  return (
    <Suspense fallback={null}>
      <BrowserRouter>
        <Switch>
          <Route path='/' component={Home} />
        </Switch>
      </BrowserRouter>
    </Suspense>
  )
}

function App() {
  return (
    <Web3ReactProvider getLibrary={getLibrary}>
      <Web3ReadOnlyProvider getLibrary={getLibrary}>
        <Web3Manager>
          <ContextProviders>
            <Updaters />
            <ThemeProvider>
              <GlobalStyle />
              <Router />
            </ThemeProvider>
          </ContextProviders>
        </Web3Manager>
      </Web3ReadOnlyProvider>
    </Web3ReactProvider>
  )
}

export default App

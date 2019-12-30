import React, { Suspense } from 'react'
import { BrowserRouter, Switch, Route } from 'react-router-dom'
import { Web3ReactProvider } from '@web3-react/core'
import Web3 from 'web3'

import Web3ReadOnlyContextProvider from './contexts/Web3ReadOnly'
import ApplicationContextProvider, {
  Updater as ApplicationContextUpdater,
} from './contexts/application'
import TransactionContextProvider, {
  Updater as TransactionContextUpdater,
} from './contexts/transaction'
import BalancesContextProvider from './contexts/Balances'
import AllowancesContextProvider from './contexts/Allowances'
import Home from './pages/Home'
import ThemeProvider, { GlobalStyle } from './themes'

function getLibrary(provider) {
  return new Web3(provider)
}

function ContextProviders({ children }) {
  return (
    <Web3ReadOnlyContextProvider>
      <ApplicationContextProvider>
        <TransactionContextProvider>
          <BalancesContextProvider>
            <AllowancesContextProvider>{children}</AllowancesContextProvider>
          </BalancesContextProvider>
        </TransactionContextProvider>
      </ApplicationContextProvider>
    </Web3ReadOnlyContextProvider>
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
      <ContextProviders>
        <Updaters />
        <ThemeProvider>
          <GlobalStyle />
          <Router />
        </ThemeProvider>
      </ContextProviders>
    </Web3ReactProvider>
  )
}

export default App

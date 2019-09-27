import React from 'react'
import { useBlockNumber } from '../contexts/application'

export default function Home() {
  const blockNumber = useBlockNumber()

  return <div>Block Number: {blockNumber}</div>
}
